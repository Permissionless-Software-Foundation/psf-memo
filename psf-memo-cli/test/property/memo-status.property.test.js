/*
  Property tests for the memo-status helper and command wiring.

  Unit tests pin a fixed status. These properties exercise broad random heights
  to confirm:

    - summary fidelity: the human summary renders the three sync heights in the
      documented shape, and is deterministic for the same input.
    - command fidelity: JSON mode reports the service status unchanged.
    - not-found: a null status is a not-found failure.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import MemoStatus from '../../src/commands/memo-status.js'
import { captureStream } from '../support/capture.js'
import { formatStatusMessage } from '../../src/lib/memo-status.js'

const rng = seededRandom(20261017)

function randomStatus () {
  return {
    startBlockHeight: Math.floor(rng() * 1e7),
    syncedBlockHeight: Math.floor(rng() * 1e7),
    chainBlockHeight: Math.floor(rng() * 1e7)
  }
}

test('formatStatusMessage renders the three sync heights in the documented shape', () => {
  for (let i = 0; i < 300; i++) {
    const status = randomStatus()

    const message = formatStatusMessage(status)

    assert.equal(
      message,
      `indexer status: start ${status.startBlockHeight}, synced ${status.syncedBlockHeight}, chain ${status.chainBlockHeight}`
    )
    assert.equal(message, formatStatusMessage(status))
  }
})

test('memo-status JSON mode reports the service status verbatim', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 150; i++) {
      const status = randomStatus()

      class FakeMemoDb {
        async getStatus () {
          return { ...status }
        }
      }

      const out = captureStream()
      const command = new MemoStatus({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: out.stream,
        stderr: captureStream().stream
      })

      const code = await command.run({ json: true })

      assert.equal(code, 0)
      assert.deepEqual(JSON.parse(out.text()), {
        message: formatStatusMessage(status),
        status
      })
    }
  } finally {
    process.exitCode = originalExitCode
  }
})

test('memo-status reports a null status as a not-found failure', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 100; i++) {
      class FakeMemoDb {
        async getStatus () {
          return null
        }
      }

      const err = captureStream()
      const command = new MemoStatus({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: captureStream().stream,
        stderr: err.stream
      })

      const code = await command.run({ json: true })

      assert.equal(code, 1)
      assert.ok(JSON.parse(err.text()).error.toLowerCase().includes('not found'))
    }
  } finally {
    process.exitCode = originalExitCode
  }
})
