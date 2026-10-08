/*
  Property tests for the memo-search read-command helpers and wiring.

  These exercise broad input ranges to confirm:

    - the query is always required when the flag is absent, the page flags parse
      as non-negative integers with the documented defaults, and the viewer is
      preserved or null.
    - blank classification: a string with no non-whitespace character is empty.
    - the empty page always carries the requested page with total 0/hasMore false.
    - JSON mode reports the service page verbatim for a query and short-circuits
      a blank query without touching the service.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom, intGen } from './harness.js'
import MemoSearch from '../../src/commands/memo-search.js'
import { captureStream } from '../support/capture.js'
import {
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SEARCH_OFFSET,
  parseSearchFlags,
  isEmptySearchQuery,
  emptySearchResult,
  formatSearchMessage
} from '../../src/lib/memo-search.js'
import { UsageError } from '../../src/lib/reporter.js'

const rng = seededRandom(20261030)
const FLAG_MAX = 1000000
const randomLimit = intGen(rng, 0, FLAG_MAX)
const randomOffset = intGen(rng, 0, FLAG_MAX)

function randomQuery () {
  return `q-${Math.floor(rng() * 1e9).toString(16)}`
}

function randomViewer () {
  return `bitcoincash:q${Math.floor(rng() * 1e18).toString(16)}`
}

function randomPost (index) {
  return {
    txid: `post-${index}-${Math.floor(rng() * 1e9).toString(16)}`,
    addr: `addr-${Math.floor(rng() * 1e9).toString(16)}`,
    text: `memo ${index}`,
    seen: Math.floor(rng() * 100)
  }
}

function randomProfile (index) {
  return {
    addr: `bitcoincash:qprofile-${index}-${Math.floor(rng() * 1e9).toString(16)}`,
    name: `Name ${index}`,
    text: `bio ${index}`
  }
}

function randomPage (maxItems = 8) {
  const postCount = Math.floor(rng() * (maxItems + 1))
  const profileCount = Math.floor(rng() * (maxItems + 1))
  const posts = []
  const profiles = []
  for (let i = 0; i < postCount; i++) posts.push(randomPost(i))
  for (let i = 0; i < profileCount; i++) profiles.push(randomProfile(i))
  return {
    posts,
    profiles,
    pagination: {
      limit: randomLimit(),
      offset: randomOffset(),
      total: Math.floor(rng() * FLAG_MAX),
      hasMore: rng() < 0.5
    }
  }
}

test('parseSearchFlags requires the query and parses the page and viewer', () => {
  for (let i = 0; i < 400; i++) {
    const query = randomQuery()
    const viewer = rng() < 0.5 ? randomViewer() : undefined
    const limit = randomLimit()
    const offset = randomOffset()

    const flags = parseSearchFlags({ query, viewer, limit: String(limit), offset: String(offset) })

    assert.equal(flags.query, query)
    assert.equal(flags.viewer, viewer || null)
    assert.equal(flags.limit, limit)
    assert.equal(flags.offset, offset)
  }

  for (const value of [undefined, null, '']) {
    const flags = parseSearchFlags({ query: 'memo', viewer: value, limit: value, offset: value })
    assert.equal(flags.limit, DEFAULT_SEARCH_LIMIT)
    assert.equal(flags.offset, DEFAULT_SEARCH_OFFSET)
    assert.equal(flags.viewer, null)
  }
})

test('parseSearchFlags rejects a missing query and bad page flags', () => {
  for (const missing of [undefined, null]) {
    assert.throws(
      () => parseSearchFlags({ query: missing }),
      (err) => err instanceof UsageError && err.message.includes('-q flag')
    )
  }

  for (let i = 0; i < 300; i++) {
    const flag = rng() < 0.5 ? '--limit' : '--offset'
    const invalid = rng() < 0.5 ? String(-(1 + Math.floor(rng() * 100))) : `x${Math.floor(rng() * 100)}`

    assert.throws(
      () => parseSearchFlags({ query: 'memo', [flag.slice(2)]: invalid }),
      (err) => err instanceof UsageError && err.message.includes(flag)
    )
  }
})

test('isEmptySearchQuery accepts only strings with no non-whitespace character', () => {
  const whitespace = ['', ' ', '   ', '\t', '\n', ' \t\n ']

  for (let i = 0; i < 300; i++) {
    const chars = Math.floor(rng() * 6)
    let blank = ''
    for (let j = 0; j < chars; j++) blank += whitespace[Math.floor(rng() * whitespace.length)]
    assert.equal(isEmptySearchQuery(blank), true)

    const query = `${blank}x${blank}`
    assert.equal(isEmptySearchQuery(query), false)
  }
})

test('emptySearchResult always reports the requested page with no matches', () => {
  for (let i = 0; i < 400; i++) {
    const limit = randomLimit()
    const offset = randomOffset()

    assert.deepEqual(emptySearchResult(limit, offset), {
      posts: [],
      profiles: [],
      pagination: { limit, offset, total: 0, hasMore: false }
    })
  }
})

test('formatSearchMessage lists every post and profile before the pagination', () => {
  for (let i = 0; i < 300; i++) {
    const { posts, profiles, pagination } = randomPage(6)
    const message = formatSearchMessage(posts, profiles, pagination)

    for (const post of posts) assert.ok(message.includes(`${post.txid}: ${post.text}`))
    for (const profile of profiles) assert.ok(message.includes(`${profile.addr}: ${profile.name}`))
    assert.ok(message.includes(
      `pagination: limit ${pagination.limit}, offset ${pagination.offset}, total ${pagination.total}, hasMore ${pagination.hasMore}`
    ))
  }
})

test('memo-search JSON mode reports the service page verbatim for a query', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 120; i++) {
      const servicePage = randomPage(8)

      class FakeMemoDb {
        async search () {
          return servicePage
        }
      }

      const out = captureStream()
      const command = new MemoSearch({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: out.stream,
        stderr: captureStream().stream
      })

      const code = await command.run({ json: true, query: 'memo' })

      assert.equal(code, 0)
      assert.deepEqual(JSON.parse(out.text()), {
        message: formatSearchMessage(servicePage.posts, servicePage.profiles, servicePage.pagination),
        ...servicePage
      })
    }
  } finally {
    process.exitCode = originalExitCode
  }
})

test('memo-search JSON mode short-circuits a blank query', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 120; i++) {
      const limit = randomLimit()
      const offset = randomOffset()
      let searched = false

      class FakeMemoDb {
        async search () {
          searched = true
          return {}
        }
      }

      const out = captureStream()
      const command = new MemoSearch({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: out.stream,
        stderr: captureStream().stream
      })

      const code = await command.run({ json: true, query: '   ', limit: String(limit), offset: String(offset) })

      assert.equal(code, 0)
      assert.equal(searched, false)
      const data = JSON.parse(out.text())
      assert.deepEqual(data.posts, [])
      assert.deepEqual(data.profiles, [])
      assert.deepEqual(data.pagination, { limit, offset, total: 0, hasMore: false })
    }
  } finally {
    process.exitCode = originalExitCode
  }
})
