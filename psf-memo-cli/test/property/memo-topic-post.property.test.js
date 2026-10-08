/*
  Property tests for the memo-topic-post write command.

  The 0x6d0c payload limit counts the room plus the message in UTF-8 bytes.
  These properties exercise broad room/message pairs to confirm a non-empty
  pair is accepted exactly when its combined byte length is within the limit,
  that the command broadcasts [room, message] unchanged under 6d0c, and that a
  missing room or message never reaches the broadcaster.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import MemoTopicPost from '../../src/commands/memo-topic-post.js'
import {
  parseTopicPostFlags,
  MAX_TOPIC_MESSAGE_BYTES
} from '../../src/lib/memo-topic-post.js'
import { UsageError } from '../../src/lib/reporter.js'
import { makeCommand } from '../support/write-command-unit.js'

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789- é中'

function randomText (rng, maxLength) {
  const length = 1 + Math.floor(rng() * maxLength)
  let text = ''
  for (let i = 0; i < length; i++) text += CHARS[Math.floor(rng() * CHARS.length)]
  return text
}

test('parseTopicPostFlags enforces the combined room and message byte limit', () => {
  const rng = seededRandom(20261111)

  for (let i = 0; i < 300; i++) {
    const room = randomText(rng, 20)
    const message = randomText(rng, 120)
    const bytes = Buffer.byteLength(room, 'utf8') + Buffer.byteLength(message, 'utf8')

    if (bytes <= MAX_TOPIC_MESSAGE_BYTES) {
      assert.deepEqual(parseTopicPostFlags({ room, memo: message }), { room, message })
    } else {
      assert.throws(
        () => parseTopicPostFlags({ room, memo: message }),
        (err) => err instanceof UsageError && err.message.includes('too long')
      )
    }
  }

  assert.throws(
    () => parseTopicPostFlags({ memo: 'hi' }),
    (err) => err instanceof UsageError && err.message.includes('-r flag')
  )
  assert.throws(
    () => parseTopicPostFlags({ room: 'general' }),
    (err) => err instanceof UsageError && err.message.includes('-m flag')
  )
  assert.throws(
    () => parseTopicPostFlags({ room: 'general', memo: '' }),
    (err) => err instanceof UsageError && err.message.includes('must not be empty')
  )
})

test('memo-topic-post broadcasts the room and message unchanged under 6d0c', async () => {
  const rng = seededRandom(20261112)
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 150; i++) {
      // Short fields keep the combined payload within the 214-byte limit.
      const room = randomText(rng, 8)
      const message = randomText(rng, 30)

      const { command, calls } = makeCommand(MemoTopicPost)

      const code = await command.run({ json: true, name: 'wallet1', room, memo: message })

      assert.equal(code, 0)
      assert.equal(calls.length, 1)
      assert.equal(calls[0].prefix, '6d0c')
      assert.deepEqual(calls[0].fields, [room, message])
    }
  } finally {
    process.exitCode = originalExitCode
  }
})
