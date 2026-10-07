/*
  Property tests for the memo-topic read-command helpers and wiring.

  These exercise broad input ranges to confirm:

    - the room is always required, the page flags parse as non-negative integers
      with the documented defaults, and the viewer is preserved or null.
    - rejection: any page value that is not a non-negative integer is a
      UsageError naming the exact flag.
    - command fidelity: JSON mode reports the service page verbatim.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom, intGen } from './harness.js'
import MemoTopic from '../../src/commands/memo-topic.js'
import { captureStream } from '../support/capture.js'
import {
  DEFAULT_TOPIC_LIMIT,
  DEFAULT_TOPIC_OFFSET,
  parseTopicFlags
} from '../../src/lib/memo-topic.js'
import { formatFeedMessage } from '../../src/lib/memo-feed.js'
import { UsageError } from '../../src/lib/reporter.js'

const rng = seededRandom(20261023)
const FLAG_MAX = 1000000
const randomLimit = intGen(rng, 0, FLAG_MAX)
const randomOffset = intGen(rng, 0, FLAG_MAX)

function randomRoom () {
  return `room-${Math.floor(rng() * 1e9).toString(16)}`
}

function randomViewer () {
  return `bitcoincash:q${Math.floor(rng() * 1e18).toString(16)}`
}

function randomPost (index) {
  return {
    txid: `post-${index}-${Math.floor(rng() * 1e9).toString(16)}`,
    text: `memo ${index}`,
    replyCount: Math.floor(rng() * 100),
    likeCount: Math.floor(rng() * 100)
  }
}

function randomPage (maxPosts = 10) {
  const count = Math.floor(rng() * (maxPosts + 1))
  const posts = []
  for (let i = 0; i < count; i++) posts.push(randomPost(i))
  return {
    posts,
    pagination: {
      limit: randomLimit(),
      offset: randomOffset(),
      total: Math.floor(rng() * FLAG_MAX),
      hasMore: rng() < 0.5
    }
  }
}

test('parseTopicFlags requires the room and parses the page and viewer', () => {
  for (let i = 0; i < 400; i++) {
    const room = randomRoom()
    const viewer = rng() < 0.5 ? randomViewer() : undefined
    const limit = randomLimit()
    const offset = randomOffset()

    const flags = parseTopicFlags({ room, viewer, limit: String(limit), offset: String(offset) })

    assert.equal(flags.room, room)
    assert.equal(flags.viewer, viewer || null)
    assert.equal(flags.limit, limit)
    assert.equal(flags.offset, offset)
  }

  for (const value of [undefined, null, '']) {
    const flags = parseTopicFlags({ room: 'general', viewer: value, limit: value, offset: value })
    assert.equal(flags.limit, DEFAULT_TOPIC_LIMIT)
    assert.equal(flags.offset, DEFAULT_TOPIC_OFFSET)
    assert.equal(flags.viewer, null)
  }
})

test('parseTopicFlags rejects a missing room and bad page flags', () => {
  assert.throws(
    () => parseTopicFlags({}),
    (err) => err instanceof UsageError && err.message.includes('-r flag')
  )

  for (let i = 0; i < 300; i++) {
    const flag = rng() < 0.5 ? '--limit' : '--offset'
    const invalid = rng() < 0.5 ? String(-(1 + Math.floor(rng() * 100))) : `x${Math.floor(rng() * 100)}`

    assert.throws(
      () => parseTopicFlags({ room: 'general', [flag.slice(2)]: invalid }),
      (err) => err instanceof UsageError && err.message.includes(flag)
    )
  }
})

test('memo-topic JSON mode reports the service page verbatim', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 150; i++) {
      const { posts, pagination } = randomPage(10)
      const servicePage = { posts, pagination }

      class FakeMemoDb {
        async getTopicPosts () {
          return servicePage
        }
      }

      const out = captureStream()
      const command = new MemoTopic({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: out.stream,
        stderr: captureStream().stream
      })

      const code = await command.run({ json: true, room: 'general' })

      assert.equal(code, 0)
      assert.deepEqual(JSON.parse(out.text()), {
        message: formatFeedMessage(posts, pagination),
        posts,
        pagination
      })
    }
  } finally {
    process.exitCode = originalExitCode
  }
})
