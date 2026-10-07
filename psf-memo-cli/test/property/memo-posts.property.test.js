/*
  Property tests for the memo-posts read-command helpers and wiring.

  These exercise broad input ranges to confirm:

    - the address is always required, and the page flags parse as non-negative
      integers with the documented defaults.
    - JSON mode reports the service page's posts and pagination verbatim.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom, intGen } from './harness.js'
import MemoPosts from '../../src/commands/memo-posts.js'
import { captureStream } from '../support/capture.js'
import {
  DEFAULT_POSTS_LIMIT,
  DEFAULT_POSTS_OFFSET,
  parsePostsFlags
} from '../../src/lib/memo-posts.js'
import { formatFeedMessage } from '../../src/lib/memo-feed.js'
import { UsageError } from '../../src/lib/reporter.js'

const rng = seededRandom(20261021)
const FLAG_MAX = 1000000
const randomLimit = intGen(rng, 0, FLAG_MAX)
const randomOffset = intGen(rng, 0, FLAG_MAX)

function randomAddress () {
  return `addr-${Math.floor(rng() * 1e9).toString(16)}`
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

test('parsePostsFlags requires the address and parses the page flags', () => {
  for (let i = 0; i < 400; i++) {
    const address = randomAddress()
    const limit = randomLimit()
    const offset = randomOffset()

    const flags = parsePostsFlags({ addr: address, limit: String(limit), offset: String(offset) })

    assert.equal(flags.address, address)
    assert.equal(flags.limit, limit)
    assert.equal(flags.offset, offset)
  }

  for (const value of [undefined, null, '']) {
    const flags = parsePostsFlags({ addr: 'addrA', limit: value, offset: value })
    assert.equal(flags.limit, DEFAULT_POSTS_LIMIT)
    assert.equal(flags.offset, DEFAULT_POSTS_OFFSET)
  }
})

test('parsePostsFlags rejects a missing address and bad page flags', () => {
  assert.throws(
    () => parsePostsFlags({}),
    (err) => err instanceof UsageError && err.message.includes('-a flag')
  )

  for (let i = 0; i < 300; i++) {
    const flag = rng() < 0.5 ? '--limit' : '--offset'
    const invalid = rng() < 0.5 ? String(-(1 + Math.floor(rng() * 100))) : `x${Math.floor(rng() * 100)}`

    assert.throws(
      () => parsePostsFlags({ addr: 'addrA', [flag.slice(2)]: invalid }),
      (err) => err instanceof UsageError && err.message.includes(flag)
    )
  }
})

test('memo-posts JSON mode reports the service page verbatim', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 150; i++) {
      const { posts, pagination } = randomPage(10)
      const servicePage = { posts, pagination }

      class FakeMemoDb {
        async getPostsByAddr () {
          return servicePage
        }
      }

      const out = captureStream()
      const command = new MemoPosts({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: out.stream,
        stderr: captureStream().stream
      })

      const code = await command.run({ json: true, addr: 'addrA' })

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
