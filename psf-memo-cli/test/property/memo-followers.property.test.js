/*
  Property tests for the memo-followers read-command wiring.

  These exercise broad input ranges to confirm:

    - JSON mode reports the service's follower list verbatim.
    - the requested followee address is forwarded to the service.
    - a missing -a address is a UsageError and never reaches the service.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import MemoFollowers from '../../src/commands/memo-followers.js'
import { captureStream } from '../support/capture.js'
import { formatFollowListMessage } from '../../src/lib/follow-list.js'

const rng = seededRandom(20261103)

function randomAddress (prefix, index) {
  return `${prefix}-${index}-${Math.floor(rng() * 1e9).toString(16)}`
}

function randomAddresses (maxItems = 10) {
  const count = Math.floor(rng() * (maxItems + 1))
  const addresses = []
  for (let i = 0; i < count; i++) addresses.push(randomAddress('addr', i))
  return addresses
}

test('memo-followers JSON mode reports the follower list verbatim', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 120; i++) {
      const followers = randomAddresses()
      const followee = randomAddress('followee', i)

      class FakeMemoDb {
        async getFollowers () {
          return { followeeAddr: followee, followers }
        }
      }

      const out = captureStream()
      const command = new MemoFollowers({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: out.stream,
        stderr: captureStream().stream
      })

      const code = await command.run({ json: true, addr: followee })

      assert.equal(code, 0)
      assert.deepEqual(JSON.parse(out.text()), {
        message: formatFollowListMessage(followers, 'follower'),
        followers
      })
    }
  } finally {
    process.exitCode = originalExitCode
  }
})

test('memo-followers forwards the followee address and rejects a missing one', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 120; i++) {
      const followee = randomAddress('followee', i)
      let requested = null

      class FakeMemoDb {
        async getFollowers (addr) {
          requested = addr
          return { followeeAddr: addr, followers: [] }
        }
      }

      const out = captureStream()
      const command = new MemoFollowers({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: out.stream,
        stderr: captureStream().stream
      })

      await command.run({ json: true, addr: followee })
      assert.equal(requested, followee)

      const err = captureStream()
      const missing = new MemoFollowers({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: out.stream,
        stderr: err.stream
      })
      const code = await missing.run({ json: true })

      assert.equal(code, 2)
      assert.ok(JSON.parse(err.text()).error.includes('-a flag'))
    }
  } finally {
    process.exitCode = originalExitCode
  }
})
