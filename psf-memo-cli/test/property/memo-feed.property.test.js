/*
  Property tests for the memo-feed read-command helpers and command wiring.

  Unit tests pin a few fixed pages and flags. These properties exercise broad
  input ranges to confirm:

    - numeric identity: a non-negative integer flag (as commander passes it, a
      string) parses back to that integer, while absent or empty flags fall
      back to the documented defaults.
    - viewer passthrough: a non-empty viewer is preserved verbatim; an empty
      or missing viewer becomes null.
    - rejection: any value that is not a non-negative integer is a UsageError
      naming the exact flag.
    - summary fidelity and stability: the human summary reports one line per
      post in input order, carries the pagination unchanged, and is
      deterministic for the same input.
    - command fidelity: JSON mode reports the service page's posts and
      pagination unchanged.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom, intGen } from './harness.js'
import MemoFeed from '../../src/commands/memo-feed.js'
import { captureStream } from '../support/capture.js'
import {
  DEFAULT_FEED_LIMIT,
  DEFAULT_FEED_OFFSET,
  parseFeedFlags,
  formatFeedMessage
} from '../../src/lib/memo-feed.js'
import { UsageError } from '../../src/lib/reporter.js'

const rng = seededRandom(20261014)

const FLAG_MAX = 1000000
const randomLimit = intGen(rng, 0, FLAG_MAX)
const randomOffset = intGen(rng, 0, FLAG_MAX)

// Viewer strings may include characters a URL must percent-encode, so the
// passthrough property is not limited to a fixed address alphabet.
const VIEWER_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:/?&=%@_- '

function randomViewer (min = 1, max = 48) {
  const length = min + Math.floor(rng() * (max - min + 1))
  let out = ''
  for (let i = 0; i < length; i++) {
    out += VIEWER_ALPHABET[Math.floor(rng() * VIEWER_ALPHABET.length)]
  }
  return out
}

// A value that must be rejected by a non-negative-integer flag.
function invalidFlagValue () {
  const roll = rng()
  if (roll < 0.25) return String(-(1 + Math.floor(rng() * FLAG_MAX)))
  if (roll < 0.5) return `${Math.floor(rng() * 100)}.${Math.floor(rng() * 100)}`
  if (roll < 0.7) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'
    let out = ''
    const length = 1 + Math.floor(rng() * 6)
    for (let i = 0; i < length; i++) {
      out += alphabet[Math.floor(rng() * alphabet.length)]
    }
    return out
  }
  return rng() < 0.5 ? 'NaN' : 'Infinity'
}

function randomPost (index) {
  const text = randomViewer(1, 32).trim() || `memo ${index}`
  return {
    txid: `tx-${index}-${Math.floor(rng() * 1e9).toString(16)}`,
    text,
    replyCount: Math.floor(rng() * 1000),
    likeCount: Math.floor(rng() * 1000)
  }
}

function randomPage (maxPosts = 12) {
  const count = Math.floor(rng() * (maxPosts + 1))
  const posts = []
  for (let i = 0; i < count; i++) posts.push(randomPost(i))
  const pagination = {
    limit: randomLimit(),
    offset: randomOffset(),
    total: Math.floor(rng() * FLAG_MAX),
    hasMore: rng() < 0.5
  }
  return { posts, pagination }
}

test('parseFeedFlags parses non-negative integer flags back to the same integer', () => {
  for (let i = 0; i < 500; i++) {
    const limit = randomLimit()
    const offset = randomOffset()

    const flags = parseFeedFlags({ limit: String(limit), offset: String(offset) })

    assert.equal(flags.limit, limit)
    assert.equal(flags.offset, offset)
    assert.equal(flags.viewer, null)
  }
})

test('parseFeedFlags falls back to the defaults for absent or empty flags', () => {
  const empty = [undefined, null, '']

  for (let i = 0; i < 200; i++) {
    const limit = empty[Math.floor(rng() * empty.length)]
    const offset = empty[Math.floor(rng() * empty.length)]

    const flags = parseFeedFlags({ limit, offset })

    assert.equal(flags.limit, DEFAULT_FEED_LIMIT)
    assert.equal(flags.offset, DEFAULT_FEED_OFFSET)
  }
})

test('parseFeedFlags preserves a non-empty viewer and nulls an empty one', () => {
  for (let i = 0; i < 300; i++) {
    const viewer = randomViewer()
    assert.equal(parseFeedFlags({ viewer }).viewer, viewer)
  }

  assert.equal(parseFeedFlags({ viewer: '' }).viewer, null)
  assert.equal(parseFeedFlags({}).viewer, null)
})

test('parseFeedFlags rejects every non-negative-integer violation with a named UsageError', () => {
  for (let i = 0; i < 500; i++) {
    const flag = rng() < 0.5 ? '--limit' : '--offset'
    const value = invalidFlagValue()

    assert.throws(
      () => parseFeedFlags({ [flag.slice(2)]: value }),
      (err) => err instanceof UsageError && err.message.includes(flag),
      `should reject ${flag}=${JSON.stringify(value)}`
    )
  }
})

test('formatFeedMessage lists every post in order and carries the pagination unchanged', () => {
  for (let i = 0; i < 300; i++) {
    const { posts, pagination } = randomPage()

    const message = formatFeedMessage(posts, pagination)

    assert.match(message, new RegExp(`^Read ${posts.length} post`))

    let cursor = -1
    for (const post of posts) {
      const at = message.indexOf(post.txid)
      assert.ok(at > cursor, `post ${post.txid} should appear after the previous one`)
      cursor = at
      assert.ok(message.includes(post.text))
      assert.ok(message.includes(`replies ${post.replyCount}`))
      assert.ok(message.includes(`likes ${post.likeCount}`))
    }

    assert.ok(message.includes(`limit ${pagination.limit}`))
    assert.ok(message.includes(`offset ${pagination.offset}`))
    assert.ok(message.includes(`total ${pagination.total}`))
    assert.ok(message.includes(`hasMore ${pagination.hasMore}`))
  }
})

test('formatFeedMessage is deterministic for the same input', () => {
  for (let i = 0; i < 200; i++) {
    const { posts, pagination } = randomPage(8)

    assert.equal(
      formatFeedMessage(posts, pagination),
      formatFeedMessage(posts, pagination)
    )
  }
})

test('memo-feed JSON mode reports the service page verbatim', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 150; i++) {
      const { posts, pagination } = randomPage(10)
      const servicePage = { posts, pagination }

      class FakeMemoDb {
        async getRecentPosts () {
          return servicePage
        }
      }

      const out = captureStream()
      const command = new MemoFeed({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: out.stream,
        stderr: captureStream().stream
      })

      const code = await command.run({ json: true })

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
