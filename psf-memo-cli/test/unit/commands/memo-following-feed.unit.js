/*
  Unit tests for the memo-following-feed read command.

  These drive the real command against injected wallet and MemoDb fakes so the
  wallet-relative address, the resolved page, the posts/pagination passthrough,
  the missing-wallet usage error, the failed request, and the endpoint override
  are pinned without a network or a wallet file.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoFollowingFeed from '../../../src/commands/memo-following-feed.js'
import { captureStream } from '../../support/capture.js'

const PAGE = {
  posts: [
    { txid: 'feed-1', addr: 'authorA', text: 'first memo', replyCount: 0, likeCount: 1 },
    { txid: 'feed-2', addr: 'authorB', text: 'second memo', replyCount: 0, likeCount: 0 }
  ],
  pagination: { limit: 50, offset: 0, total: 2, hasMore: false }
}

// Build a MemoDb stand-in that records its options, the requested address, and
// the requested page, then resolves the supplied result or error.
function fakeMemoDb ({ result, error } = {}) {
  const calls = { opts: null, addr: null, page: null }
  class FakeMemoDb {
    constructor (opts) {
      calls.opts = opts
    }

    async getFollowingFeed (addr, page) {
      calls.addr = addr
      calls.page = page
      if (error) throw error
      return result
    }
  }
  return { FakeMemoDb, calls }
}

function walletUtilFor (address = 'addrA') {
  const wallet = { walletInfo: { cashAddress: address } }
  return {
    instanceWallet: async () => wallet,
    instanceWalletFromWif: async () => wallet
  }
}

function makeCommand (fake, { envUrl = null, walletUtil = walletUtilFor() } = {}) {
  const out = captureStream()
  const err = captureStream()
  const command = new MemoFollowingFeed({
    MemoDbClass: fake.FakeMemoDb,
    envUrl,
    walletUtil,
    stdout: out.stream,
    stderr: err.stream
  })
  return { command, out, err }
}

describe('#memo-following-feed command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('resolves the wallet address and reports the Following feed page as JSON', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command, out, err } = makeCommand(fake)

    const code = await command.run({ json: true, name: 'wallet1' })

    assert.equal(code, 0)
    assert.equal(fake.calls.addr, 'addrA')
    assert.deepEqual(fake.calls.page, { limit: 50, offset: 0 })

    const data = JSON.parse(out.text())
    assert.deepEqual(data.posts, PAGE.posts)
    assert.deepEqual(data.pagination, PAGE.pagination)
    assert.equal(err.text(), '')
  })

  it('accepts a WIF wallet source', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command } = makeCommand(fake, { walletUtil: walletUtilFor('addrW') })

    const code = await command.run({ json: true, wif: 'wif-one' })

    assert.equal(code, 0)
    assert.equal(fake.calls.addr, 'addrW')
  })

  it('reports a missing wallet source as the documented usage error (exit 2)', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), {
      error: 'You must specify a wallet name with the -n flag or a WIF with the --wif flag.'
    })
    assert.equal(fake.calls.addr, null)
  })

  it('forwards the resolved page to the service', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command } = makeCommand(fake)

    await command.run({ json: true, name: 'wallet1', limit: '2', offset: '4' })

    assert.deepEqual(fake.calls.page, { limit: 2, offset: 4 })
  })

  it('prints the human-readable feed summary', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command, out } = makeCommand(fake)

    const code = await command.run({ name: 'wallet1' })

    assert.equal(code, 0)
    const printed = out.text()
    assert.include(printed, 'Read 2 posts')
    assert.include(printed, 'feed-1: first memo (replies 0, likes 1)')
    assert.include(printed, 'pagination: limit 50, offset 0, total 2, hasMore false')
  })

  it('reports a bad --limit as a usage error (exit 2) without reading', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true, name: 'wallet1', limit: 'x' })

    assert.equal(code, 2)
    assert.include(JSON.parse(err.text()).error, '--limit')
    assert.equal(fake.calls.addr, null)
  })

  it('reports a failed request on stderr with exit 1', async () => {
    const fake = fakeMemoDb({ error: new Error('Memo DB request failed with HTTP 500') })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true, name: 'wallet1' })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'Memo DB request failed with HTTP 500')
  })

  it('forwards the environment and db-url override to the client', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command } = makeCommand(fake, { envUrl: 'https://env.example' })

    await command.run({ json: true, name: 'wallet1', dbUrl: 'https://flag.example' })

    assert.equal(fake.calls.opts.envUrl, 'https://env.example')
    assert.equal(fake.calls.opts.dbUrl, 'https://flag.example')
  })

  it('resolves the default page without reading', () => {
    const command = new MemoFollowingFeed({ MemoDbClass: fakeMemoDb().FakeMemoDb })

    assert.deepEqual(command.validateFlags({}), { limit: 50, offset: 0, name: null, wif: null })
  })
})
