/*
  Property tests for the address write commands.

  memo-follow, memo-unfollow, memo-mute, and memo-unmute broadcast one
  display-order address hash160 under their own action prefix. These properties
  exercise broad random addresses to confirm the broadcast carries exactly the
  decoded hash160 under the command's prefix, and that a missing or malformed
  address never reaches the broadcaster.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import cashaddr from 'ecashaddrjs'
import { seededRandom } from './harness.js'
import MemoFollow from '../../src/commands/memo-follow.js'
import MemoUnfollow from '../../src/commands/memo-unfollow.js'
import MemoMute from '../../src/commands/memo-mute.js'
import MemoUnmute from '../../src/commands/memo-unmute.js'
import { makeCommand } from '../support/write-command-unit.js'

const COMMANDS = [
  { name: 'memo-follow', Command: MemoFollow, prefix: '6d06' },
  { name: 'memo-unfollow', Command: MemoUnfollow, prefix: '6d07' },
  { name: 'memo-mute', Command: MemoMute, prefix: '6d16' },
  { name: 'memo-unmute', Command: MemoUnmute, prefix: '6d17' }
]

// A random 20-byte hash160 encoded as a cash address.
function randomTarget (rng) {
  const hash = Buffer.alloc(20)
  for (let i = 0; i < 20; i++) hash[i] = Math.floor(rng() * 256)
  return { addr: cashaddr.encode('bitcoincash', 'P2PKH', new Uint8Array(hash)), hash }
}

test('address write commands broadcast the display-order hash160 under their prefix', async () => {
  const rng = seededRandom(20261109)
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 150; i++) {
      const { addr, hash } = randomTarget(rng)

      for (const { name, Command, prefix } of COMMANDS) {
        const { command, calls } = makeCommand(Command)

        const code = await command.run({ json: true, name: 'wallet1', addr })

        assert.equal(code, 0, `${name} exit code`)
        assert.equal(calls.length, 1, `${name} broadcast count`)
        assert.equal(calls[0].prefix, prefix, `${name} prefix`)
        assert.equal(calls[0].fields.length, 1, `${name} field count`)
        assert.ok(Buffer.from(calls[0].fields[0]).equals(hash), `${name} hash160`)
      }
    }
  } finally {
    process.exitCode = originalExitCode
  }
})

test('address write commands reject missing and malformed addresses without broadcasting', async () => {
  const originalExitCode = process.exitCode

  try {
    for (const { name, Command } of COMMANDS) {
      for (const addr of [undefined, '', 'not-an-address']) {
        const { command, err, calls } = makeCommand(Command)

        const code = await command.run({ json: true, name: 'wallet1', addr })

        assert.equal(code, 2, `${name} exit for ${JSON.stringify(addr)}`)
        assert.equal(calls.length, 0, `${name} broadcast for ${JSON.stringify(addr)}`)
        assert.ok(JSON.parse(err.text()).error.length > 0, `${name} error message`)
      }
    }
  } finally {
    process.exitCode = originalExitCode
  }
})
