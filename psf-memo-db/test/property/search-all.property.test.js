/*
  Property tests for the SearchAll use case.

  The unit tests probe a few fixed fixtures. These properties cover broad
  random inputs so the invariants hold everywhere:

    - pagination consistency: total equals the combined result count and
      hasMore matches the offset/returned-count arithmetic.
    - empty query: an empty or whitespace query yields an empty result with
      total 0 and hasMore false.
    - ordering: returned posts and profiles are sorted by block height
      descending.
    - query normalization: the trimmed, lowercased query is passed to the
      adapter.
*/

import test from 'node:test'
import { seededRandom, forAll, intGen } from './harness.js'
import SearchAll from '../../src/use-cases/search-all.js'

const rng = seededRandom(20260831)

function recordGen (kind) {
  const n = intGen(rng, 0, 10)()
  const records = []
  for (let i = 0; i < n; i++) {
    const base = {
      seen: intGen(rng, 0, 1000)(),
      blockHeight: intGen(rng, 0, 1000000)()
    }
    if (kind === 'post') {
      records.push({ txid: `tx${i}`, addr: `addr${i}`, text: `text ${i}`, ...base })
    } else {
      records.push({ addr: `addr${i}`, name: `name ${i}`, text: `bio ${i}`, ...base })
    }
  }
  return records
}

function makeUseCase (posts, profiles) {
  return new SearchAll({
    adapters: {
      searchQuery: {
        searchPosts: async () => posts,
        searchProfiles: async () => profiles
      }
    }
  })
}

function isSortedDesc (records) {
  for (let i = 1; i < records.length; i++) {
    if (records[i - 1].blockHeight < records[i].blockHeight) return false
  }
  return true
}

test('pagination metadata is consistent with the result set', async () => {
  await forAll(
    (i) => ({ posts: recordGen('post'), profiles: recordGen('profile') }),
    async ({ posts, profiles }) => {
      const uut = makeUseCase(posts, profiles)
      const limit = intGen(rng, 1, 100)()
      const offset = intGen(rng, 0, 20)()
      const result = await uut.execute({ q: 'x', limit, offset })

      const total = posts.length + profiles.length
      const returnedCount = result.posts.length + result.profiles.length
      const hasMore = offset + returnedCount < total

      return result.pagination.total === total &&
        result.pagination.hasMore === hasMore &&
        result.pagination.limit === limit &&
        result.pagination.offset === offset
    },
    { label: 'pagination consistency' }
  )
})

test('empty and whitespace queries return an empty result', async () => {
  await forAll(
    (i) => ({ posts: recordGen('post'), profiles: recordGen('profile') }),
    async ({ posts, profiles }) => {
      const uut = makeUseCase(posts, profiles)
      const empty = await uut.execute({ q: '' })
      const whitespace = await uut.execute({ q: '   ' })

      return empty.posts.length === 0 &&
        empty.profiles.length === 0 &&
        empty.pagination.total === 0 &&
        empty.pagination.hasMore === false &&
        whitespace.posts.length === 0 &&
        whitespace.pagination.total === 0
    },
    { label: 'empty query result' }
  )
})

test('returned posts and profiles are sorted by block height descending', async () => {
  await forAll(
    (i) => ({ posts: recordGen('post'), profiles: recordGen('profile') }),
    async ({ posts, profiles }) => {
      const uut = makeUseCase(posts, profiles)
      const result = await uut.execute({ q: 'x', limit: 100, offset: 0 })

      return isSortedDesc(result.posts) && isSortedDesc(result.profiles)
    },
    { label: 'block height ordering' }
  )
})

test('the trimmed, lowercased query is passed to the adapter', async () => {
  await forAll(
    (i) => ({ posts: recordGen('post'), profiles: recordGen('profile') }),
    async ({ posts, profiles }) => {
      let receivedPosts = null
      let receivedProfiles = null
      const uut = new SearchAll({
        adapters: {
          searchQuery: {
            searchPosts: async (q) => { receivedPosts = q; return posts },
            searchProfiles: async (q) => { receivedProfiles = q; return profiles }
          }
        }
      })
      await uut.execute({ q: '  HeLLo  ' })

      return receivedPosts === 'hello' && receivedProfiles === 'hello'
    },
    { label: 'query normalization' }
  )
})
