/*
  Property tests for the topic room write commands.

  memo-topic-follow and memo-topic-unfollow broadcast the required -r room as
  one plain UTF-8 field under their own prefix. These properties exercise broad
  random room names to confirm the broadcast carries exactly the room under the
  command's prefix, and that a missing or empty room never reaches the
  broadcaster.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom, randomText } from './harness.js'
import MemoTopicFollow from '../../src/commands/memo-topic-follow.js'
import MemoTopicUnfollow from '../../src/commands/memo-topic-unfollow.js'
import { makeCommand } from '../support/write-command-unit.js'

const COMMANDS = [
  { name: 'memo-topic-follow', Command: MemoTopicFollow, prefix: '6d0d' },
  { name: 'memo-topic-unfollow', Command: MemoTopicUnfollow, prefix: '6d0e' }
]

const ROOM_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789- é中'

test('topic room write commands broadcast the room under their prefix', async () => {
  const rng = seededRandom(20261110)
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 150; i++) {
      const room = randomText(rng, ROOM_CHARS, 20)

      for (const { name, Command, prefix } of COMMANDS) {
        const { command, calls } = makeCommand(Command)

        const code = await command.run({ json: true, name: 'wallet1', room })

        assert.equal(code, 0, `${name} exit code`)
        assert.equal(calls.length, 1, `${name} broadcast count`)
        assert.equal(calls[0].prefix, prefix, `${name} prefix`)
        assert.deepEqual(calls[0].fields, [room], `${name} room field`)
      }
    }
  } finally {
    process.exitCode = originalExitCode
  }
})

test('topic room write commands reject a missing or empty room without broadcasting', async () => {
  const originalExitCode = process.exitCode

  try {
    for (const { name, Command } of COMMANDS) {
      for (const room of [undefined, '']) {
        const { command, err, calls } = makeCommand(Command)

        const code = await command.run({ json: true, name: 'wallet1', room })

        assert.equal(code, 2, `${name} exit for ${JSON.stringify(room)}`)
        assert.equal(calls.length, 0, `${name} broadcast for ${JSON.stringify(room)}`)
        assert.ok(JSON.parse(err.text()).error.includes('-r flag'), `${name} error`)
      }
    }
  } finally {
    process.exitCode = originalExitCode
  }
})
