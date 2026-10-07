/*
  Property tests for the memo-profile read-command helpers and wiring.

  These exercise broad input ranges to confirm:

    - the address is always required, the page flags parse as non-negative
      integers with the documented defaults, and the viewer is preserved or
      null.
    - the human summary lists every reported post in order and carries the
      pagination unchanged.
    - JSON mode reports the composed identity, post page, pagination, and follow
      state verbatim.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom, intGen } from './harness.js'
import MemoProfile from '../../src/commands/memo-profile.js'
import { captureStream } from '../support/capture.js'
import {
  DEFAULT_PROFILE_LIMIT,
  DEFAULT_PROFILE_OFFSET,
  parseProfileFlags,
  formatProfileMessage
} from '../../src/lib/memo-profile.js'
import { UsageError } from '../../src/lib/reporter.js'

const rng = seededRandom(20261020)
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

test('parseProfileFlags requires the address and parses the page and viewer', () => {
  for (let i = 0; i < 400; i++) {
    const address = randomAddress()
    const viewer = rng() < 0.5 ? randomAddress() : undefined
    const limit = randomLimit()
    const offset = randomOffset()

    const flags = parseProfileFlags({
      addr: address,
      viewer,
      limit: String(limit),
      offset: String(offset)
    })

    assert.equal(flags.address, address)
    assert.equal(flags.viewer, viewer || null)
    assert.equal(flags.limit, limit)
    assert.equal(flags.offset, offset)
  }

  for (const value of [undefined, null, '']) {
    const flags = parseProfileFlags({ addr: 'addrA', viewer: value, limit: value, offset: value })
    assert.equal(flags.limit, DEFAULT_PROFILE_LIMIT)
    assert.equal(flags.offset, DEFAULT_PROFILE_OFFSET)
    assert.equal(flags.viewer, null)
  }
})

test('parseProfileFlags rejects a missing address and bad page flags', () => {
  assert.throws(
    () => parseProfileFlags({}),
    (err) => err instanceof UsageError && err.message.includes('-a flag')
  )

  for (let i = 0; i < 300; i++) {
    const flag = rng() < 0.5 ? '--limit' : '--offset'
    const invalid = rng() < 0.5 ? String(-(1 + Math.floor(rng() * 100))) : `x${Math.floor(rng() * 100)}`

    assert.throws(
      () => parseProfileFlags({ addr: 'addrA', [flag.slice(2)]: invalid }),
      (err) => err instanceof UsageError && err.message.includes(flag)
    )
  }
})

test('formatProfileMessage lists every post in order and carries pagination', () => {
  for (let i = 0; i < 250; i++) {
    const { posts, pagination } = randomPage()
    const profile = {
      address: randomAddress(),
      name: 'name',
      bio: 'bio',
      avatar: 'https://example/a.png',
      posts,
      pagination,
      following: rng() < 0.5
    }

    const message = formatProfileMessage(profile)

    assert.match(message, new RegExp(`^address: ${profile.address}`))
    assert.match(message, new RegExp(`following: ${profile.following}`))

    let cursor = -1
    for (const post of posts) {
      const at = message.indexOf(post.txid)
      assert.ok(at > cursor, `post ${post.txid} should appear after the previous one`)
      cursor = at
      assert.ok(message.includes(post.text))
    }

    assert.ok(message.includes(`total ${pagination.total}`))
    assert.ok(message.includes(`hasMore ${pagination.hasMore}`))
  }
})

test('memo-profile JSON mode reports the composed profile verbatim', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 120; i++) {
      const { posts, pagination } = randomPage(8)
      const following = rng() < 0.5
      let followCalls = 0

      class FakeMemoDb {
        async getName () {
          return { name: 'alice' }
        }

        async getProfile () {
          return { text: 'hello memo' }
        }

        async getProfilePic () {
          return { url: 'https://example/a.png' }
        }

        async getPostsByAddr () {
          return { posts, pagination }
        }

        async getFollowState () {
          followCalls++
          return { following }
        }
      }

      const out = captureStream()
      const command = new MemoProfile({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: out.stream,
        stderr: captureStream().stream
      })

      const code = await command.run({ json: true, addr: 'addrA', viewer: 'viewerB' })

      assert.equal(code, 0)
      assert.equal(followCalls, 1)
      const composed = {
        address: 'addrA',
        name: 'alice',
        bio: 'hello memo',
        avatar: 'https://example/a.png',
        posts,
        pagination,
        following
      }
      assert.deepEqual(JSON.parse(out.text()), {
        message: formatProfileMessage(composed),
        ...composed
      })
    }
  } finally {
    process.exitCode = originalExitCode
  }
})
