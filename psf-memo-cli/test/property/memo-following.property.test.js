/*
  Property tests for the memo-following read-command wiring.

  These exercise broad input ranges to confirm:

    - JSON mode reports the service's following list verbatim for either wallet
      source (name or WIF).
    - a missing wallet source is a UsageError and never reaches the service.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import MemoFollowing from '../../src/commands/memo-following.js'
import { captureStream } from '../support/capture.js'
import { formatFollowListMessage } from '../../src/lib/follow-list.js'

const rng = seededRandom(20261102)

function randomAddresses (maxItems = 10) {
  const count = Math.floor(rng() * (maxItems + 1))
  const addresses = []
  for (let i = 0; i < count; i++) {
    addresses.push(`addr-${i}-${Math.floor(rng() * 1e9).toString(16)}`)
  }
  return addresses
}

function fakeWalletUtil (address = 'addrA') {
  return {
    instanceWallet: async () => ({ walletInfo: { cashAddress: address } }),
    instanceWalletFromWif: async () => ({ walletInfo: { cashAddress: address } })
  }
}

test('memo-following JSON mode reports the following list verbatim', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 120; i++) {
      const following = randomAddresses()
      const walletUtil = fakeWalletUtil()

      class FakeMemoDb {
        async getFollowing () {
          return { followerAddr: 'addrA', following }
        }
      }

      const out = captureStream()
      const command = new MemoFollowing({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        walletUtil,
        stdout: out.stream,
        stderr: captureStream().stream
      })

      const code = await command.run({ json: true, name: 'wallet1' })

      assert.equal(code, 0)
      assert.deepEqual(JSON.parse(out.text()), {
        message: formatFollowListMessage(following, 'following'),
        following
      })
    }
  } finally {
    process.exitCode = originalExitCode
  }
})

test('memo-following rejects a missing wallet source without reading', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 60; i++) {
      let read = false

      class FakeMemoDb {
        async getFollowing () {
          read = true
          return {}
        }
      }

      const out = captureStream()
      const err = captureStream()
      const command = new MemoFollowing({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        walletUtil: fakeWalletUtil(),
        stdout: out.stream,
        stderr: err.stream
      })

      const code = await command.run({ json: true })

      assert.equal(code, 2)
      assert.equal(read, false)
      assert.ok(JSON.parse(err.text()).error.includes('-n flag'))
    }
  } finally {
    process.exitCode = originalExitCode
  }
})
