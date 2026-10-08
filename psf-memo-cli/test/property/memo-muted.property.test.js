/*
  Property tests for the memo-muted read-command wiring.

  These exercise broad input ranges to confirm:

    - JSON mode reports the service's muted list verbatim.
    - a missing wallet source is a UsageError and never reaches the service.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import MemoMuted from '../../src/commands/memo-muted.js'
import { captureStream } from '../support/capture.js'
import { formatFollowListMessage } from '../../src/lib/follow-list.js'

const rng = seededRandom(20261104)

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

test('memo-muted JSON mode reports the muted list verbatim', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 120; i++) {
      const muted = randomAddresses()

      class FakeMemoDb {
        async getMuted () {
          return { muterAddr: 'addrA', muted }
        }
      }

      const out = captureStream()
      const command = new MemoMuted({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        walletUtil: fakeWalletUtil(),
        stdout: out.stream,
        stderr: captureStream().stream
      })

      const code = await command.run({ json: true, name: 'wallet1' })

      assert.equal(code, 0)
      assert.deepEqual(JSON.parse(out.text()), {
        message: formatFollowListMessage(muted, 'muted'),
        muted
      })
    }
  } finally {
    process.exitCode = originalExitCode
  }
})

test('memo-muted rejects a missing wallet source without reading', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 60; i++) {
      let read = false

      class FakeMemoDb {
        async getMuted () {
          read = true
          return {}
        }
      }

      const out = captureStream()
      const err = captureStream()
      const command = new MemoMuted({
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
