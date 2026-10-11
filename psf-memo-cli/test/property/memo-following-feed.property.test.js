/*
  Property tests for the memo-following-feed page parser and command.

  Unit tests pin fixed shapes. These properties exercise broad input ranges to
  confirm:

    - parsing: absent/empty page flags fall back to 50/0, any non-negative
      integer string round-trips, and any negative, fractional, or non-numeric
      value is a UsageError naming the flag.
    - command: the wallet-resolved address and the parsed page are forwarded
      verbatim, success exits 0 and round-trips the posts/pagination through
      JSON, a missing wallet source exits 2 without a read, and a failed
      request exits 1.
*/

import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import {
  parseFollowingFeedFlags,
  DEFAULT_FOLLOWING_FEED_LIMIT,
  DEFAULT_FOLLOWING_FEED_OFFSET
} from '../../src/lib/memo-following-feed.js'
import MemoFollowingFeed from '../../src/commands/memo-following-feed.js'
import { UsageError } from '../../src/lib/reporter.js'
import { captureStream } from '../support/capture.js'

const rng = seededRandom(20261015)

const ADDRESS_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

// The command assigns process.exitCode; restore it so a usage/failure path in
// one property does not leak an exit code into the runner.
let originalExitCode
beforeEach(() => { originalExitCode = process.exitCode })
afterEach(() => { process.exitCode = originalExitCode })

function randomAddress () {
  const length = 5 + Math.floor(rng() * 24)
  let address = 'bitcoincash:q'
  for (let i = 0; i < length; i++) {
    address += ADDRESS_CHARS[Math.floor(rng() * ADDRESS_CHARS.length)]
  }
  return address
}

function walletUtilFor (address) {
  const wallet = { walletInfo: { cashAddress: address } }
  return {
    instanceWallet: async () => wallet,
    instanceWalletFromWif: async () => wallet
  }
}

test('parseFollowingFeedFlags defaults and round-trips non-negative pages', () => {
  assert.deepEqual(parseFollowingFeedFlags(), {
    limit: DEFAULT_FOLLOWING_FEED_LIMIT,
    offset: DEFAULT_FOLLOWING_FEED_OFFSET
  })

  for (const value of [undefined, null, '']) {
    assert.deepEqual(parseFollowingFeedFlags({ limit: value, offset: value }), {
      limit: DEFAULT_FOLLOWING_FEED_LIMIT,
      offset: DEFAULT_FOLLOWING_FEED_OFFSET
    })
  }

  for (let i = 0; i < 300; i++) {
    const limit = Math.floor(rng() * 1e6)
    const offset = Math.floor(rng() * 1e6)

    assert.deepEqual(parseFollowingFeedFlags({ limit: String(limit), offset: String(offset) }), {
      limit,
      offset
    })
  }
})

test('parseFollowingFeedFlags rejects every negative, fractional, or non-numeric page', () => {
  const bad = ['-1', '-100', '1.5', 'x', 'abc', 'NaN', '1 2', '+', '.', '1,5']

  for (const value of bad) {
    assert.throws(
      () => parseFollowingFeedFlags({ limit: value }),
      (err) => err instanceof UsageError && err.message.includes('--limit')
    )
    assert.throws(
      () => parseFollowingFeedFlags({ offset: value }),
      (err) => err instanceof UsageError && err.message.includes('--offset')
    )
  }
})

test('the command forwards the resolved address and page and exits 0', async () => {
  for (let i = 0; i < 200; i++) {
    const address = randomAddress()
    const posts = Array.from({ length: Math.floor(rng() * 4) }, (unused, j) => ({
      txid: `tx-${j}-${Math.floor(rng() * 1e6)}`,
      addr: randomAddress(),
      text: `memo-${j}`
    }))
    const pagination = { limit: 50, offset: 0, total: posts.length, hasMore: false }
    const page = { posts, pagination }
    const limit = Math.floor(rng() * 1e4)
    const offset = Math.floor(rng() * 1e4)
    const calls = { addr: null, page: null }

    class FakeMemoDb {
      async getFollowingFeed (addr, requestedPage) {
        calls.addr = addr
        calls.page = requestedPage
        return page
      }
    }

    const out = captureStream()
    const err = captureStream()
    const command = new MemoFollowingFeed({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      walletUtil: walletUtilFor(address),
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true, name: 'wallet1', limit: String(limit), offset: String(offset) })
    const data = JSON.parse(out.text())

    assert.equal(code, 0)
    assert.equal(calls.addr, address)
    assert.deepEqual(calls.page, { limit, offset })
    assert.deepEqual(data.posts, posts)
    assert.deepEqual(data.pagination, pagination)
    assert.equal(err.text(), '')
  }
})

test('a missing wallet source always exits 2 without a read', async () => {
  for (let i = 0; i < 100; i++) {
    const calls = { addr: null }

    class FakeMemoDb {
      async getFollowingFeed (addr) {
        calls.addr = addr
        return {}
      }
    }

    const walletUtil = {
      instanceWallet: async () => { throw new Error('must not resolve a wallet') },
      instanceWalletFromWif: async () => { throw new Error('must not resolve a wallet') }
    }
    const err = captureStream()
    const command = new MemoFollowingFeed({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      walletUtil,
      stdout: captureStream().stream,
      stderr: err.stream
    })

    const code = await command.run({ json: rng() < 0.5, limit: String(Math.floor(rng() * 100)) })

    assert.equal(code, 2)
    assert.equal(calls.addr, null)
    assert.ok(err.text().includes('You must specify a wallet name with the -n flag or a WIF with the --wif flag.'))
  }
})

test('a failed request always exits 1', async () => {
  for (let i = 0; i < 100; i++) {
    const message = `HTTP ${400 + Math.floor(rng() * 200)}`

    class FakeMemoDb {
      async getFollowingFeed () {
        throw new Error(message)
      }
    }

    const err = captureStream()
    const command = new MemoFollowingFeed({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      walletUtil: walletUtilFor(randomAddress()),
      stdout: captureStream().stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true, name: 'wallet1' })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, message)
  }
})
