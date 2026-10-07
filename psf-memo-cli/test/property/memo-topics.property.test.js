/*
  Property tests for the memo-topics read-command helpers and wiring.

  These exercise broad input ranges to confirm:

    - numeric identity: a non-negative integer flag parses back to that integer,
      while absent or empty flags fall back to the documented defaults.
    - rejection: any value that is not a non-negative integer is a UsageError
      naming the exact flag.
    - summary fidelity: the human summary lists every topic in order with its
      metadata and carries the pagination unchanged.
    - command fidelity: JSON mode reports the service page verbatim.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom, intGen } from './harness.js'
import MemoTopics from '../../src/commands/memo-topics.js'
import { captureStream } from '../support/capture.js'
import {
  DEFAULT_TOPICS_LIMIT,
  DEFAULT_TOPICS_OFFSET,
  parseTopicsFlags,
  formatTopicsMessage
} from '../../src/lib/memo-topics.js'
import { UsageError } from '../../src/lib/reporter.js'

const rng = seededRandom(20261022)
const FLAG_MAX = 1000000
const randomLimit = intGen(rng, 0, FLAG_MAX)
const randomOffset = intGen(rng, 0, FLAG_MAX)

// A value that must be rejected by a non-negative-integer flag.
function invalidFlagValue () {
  const roll = rng()
  if (roll < 0.3) return String(-(1 + Math.floor(rng() * FLAG_MAX)))
  if (roll < 0.6) return `${Math.floor(rng() * 100)}.${1 + Math.floor(rng() * 99)}`
  if (roll < 0.8) return rng() < 0.5 ? 'NaN' : 'Infinity'
  return `x${Math.floor(rng() * 100)}`
}

function randomTopic (index) {
  return {
    room: `room-${index}-${Math.floor(rng() * 1e9).toString(16)}`,
    postCount: Math.floor(rng() * 1000),
    lastSeen: Math.floor(rng() * 1e13),
    followerCount: Math.floor(rng() * 1000)
  }
}

function randomPage (maxTopics = 10) {
  const count = Math.floor(rng() * (maxTopics + 1))
  const topics = []
  for (let i = 0; i < count; i++) topics.push(randomTopic(i))
  return {
    topics,
    pagination: {
      limit: randomLimit(),
      offset: randomOffset(),
      total: Math.floor(rng() * FLAG_MAX),
      hasMore: rng() < 0.5
    }
  }
}

test('parseTopicsFlags parses non-negative integer flags and defaults', () => {
  for (let i = 0; i < 500; i++) {
    const limit = randomLimit()
    const offset = randomOffset()

    const flags = parseTopicsFlags({ limit: String(limit), offset: String(offset) })

    assert.equal(flags.limit, limit)
    assert.equal(flags.offset, offset)
  }

  for (const value of [undefined, null, '']) {
    const flags = parseTopicsFlags({ limit: value, offset: value })
    assert.equal(flags.limit, DEFAULT_TOPICS_LIMIT)
    assert.equal(flags.offset, DEFAULT_TOPICS_OFFSET)
  }
})

test('parseTopicsFlags rejects every violation with a named UsageError', () => {
  for (let i = 0; i < 500; i++) {
    const flag = rng() < 0.5 ? '--limit' : '--offset'
    const value = invalidFlagValue()

    assert.throws(
      () => parseTopicsFlags({ [flag.slice(2)]: value }),
      (err) => err instanceof UsageError && err.message.includes(flag)
    )
  }
})

test('formatTopicsMessage lists every topic in order and carries pagination', () => {
  for (let i = 0; i < 300; i++) {
    const { topics, pagination } = randomPage()

    const message = formatTopicsMessage(topics, pagination)

    assert.match(message, new RegExp(`^Read ${topics.length} topic`))

    let cursor = -1
    for (const topic of topics) {
      const at = message.indexOf(topic.room)
      assert.ok(at > cursor, `topic ${topic.room} should appear after the previous one`)
      cursor = at
      assert.ok(message.includes(`${topic.postCount} posts`))
      assert.ok(message.includes(`${topic.followerCount} followers`))
      assert.ok(message.includes(`lastSeen ${topic.lastSeen}`))
    }

    assert.ok(message.includes(`total ${pagination.total}`))
    assert.ok(message.includes(`hasMore ${pagination.hasMore}`))
  }
})

test('memo-topics JSON mode reports the service page verbatim', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 150; i++) {
      const { topics, pagination } = randomPage(10)
      const servicePage = { topics, pagination }

      class FakeMemoDb {
        async getTopics () {
          return servicePage
        }
      }

      const out = captureStream()
      const command = new MemoTopics({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: out.stream,
        stderr: captureStream().stream
      })

      const code = await command.run({ json: true })

      assert.equal(code, 0)
      assert.deepEqual(JSON.parse(out.text()), {
        message: formatTopicsMessage(topics, pagination),
        topics,
        pagination
      })
    }
  } finally {
    process.exitCode = originalExitCode
  }
})
