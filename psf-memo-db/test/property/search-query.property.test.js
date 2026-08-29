/*
  Property tests for the SearchQuery adapter.

  The unit tests probe a few fixed fixtures. These properties cover broad
  random record sets so the invariants hold everywhere:

    - case-insensitivity: searching with a differently-cased query returns the
      same result set as the lowercase query.
    - reply exclusion: post search never returns a reply txid.
    - substring containment: every returned post's text contains the query.
    - empty query: empty and whitespace-only queries return no results.
    - profile matching: every returned profile matches by name or bio.
*/

import test from 'node:test'
import { seededRandom, forAll, intGen, txidGen } from './harness.js'
import SearchQuery from '../../src/adapters/search-query.js'

const rng = seededRandom(20260830)

const WORDS = ['hello', 'bitcoin', 'cash', 'memo', 'protocol', 'trout', 'alice', 'bob', 'block', 'chain']

function randomText (rng) {
  const n = intGen(rng, 1, 4)()
  const words = []
  for (let i = 0; i < n; i++) {
    words.push(WORDS[Math.floor(rng() * WORDS.length)])
  }
  return words.join(' ')
}

function makeIterator (entries) {
  return async function * () {
    for (const entry of entries) {
      yield entry
    }
  }
}

function makeDb (entries) {
  return { iterator: () => makeIterator(entries)() }
}

// Build a random set of posts (as [txid, post] pairs), some of which are replies.
function postSetGen () {
  const posts = []
  const n = intGen(rng, 0, 8)()
  for (let i = 0; i < n; i++) {
    const txid = txidGen(rng)
    posts.push([txid, {
      addr: `addr${i}`,
      text: randomText(rng),
      seen: intGen(rng, 0, 1000)(),
      blockHeight: intGen(rng, 0, 1000000)()
    }])
  }
  const replyTxids = new Set()
  const parents = []
  for (const [txid] of posts) {
    if (rng() < 0.3) {
      replyTxids.add(txid)
      parents.push([txid, { parentTxid: 'parent' }])
    }
  }
  return { posts, parents, replyTxids }
}

// Build a random set of names and profiles (as [addr, record] pairs).
function profileSetGen () {
  const names = []
  const profiles = []
  const n = intGen(rng, 0, 8)()
  for (let i = 0; i < n; i++) {
    const addr = `addr${i}`
    if (rng() < 0.7) {
      names.push([addr, { name: randomText(rng), txid: txidGen(rng), seen: intGen(rng, 0, 1000)(), blockHeight: intGen(rng, 0, 1000000)() }])
    }
    if (rng() < 0.7) {
      profiles.push([addr, { text: randomText(rng), txid: txidGen(rng), seen: intGen(rng, 0, 1000)(), blockHeight: intGen(rng, 0, 1000000)() }])
    }
  }
  return { names, profiles }
}

function makeQuery (posts, parents, names, profiles) {
  return new SearchQuery({
    postsDb: makeDb(posts),
    postParentsDb: makeDb(parents),
    namesDb: makeDb(names),
    profilesDb: makeDb(profiles)
  })
}

test('post search is case-insensitive', async () => {
  await forAll(
    (i) => postSetGen(),
    async ({ posts, parents }) => {
      const query = makeQuery(posts, parents, [], [])
      const word = WORDS[Math.floor(rng() * WORDS.length)]
      const a = (await query.searchPosts(word.toUpperCase())).map((p) => p.txid).sort()
      const b = (await query.searchPosts(word.toLowerCase())).map((p) => p.txid).sort()
      return JSON.stringify(a) === JSON.stringify(b)
    },
    { label: 'post search case-insensitivity' }
  )
})

test('post search never returns reply txids', async () => {
  await forAll(
    (i) => postSetGen(),
    async ({ posts, parents, replyTxids }) => {
      const query = makeQuery(posts, parents, [], [])
      const word = WORDS[Math.floor(rng() * WORDS.length)]
      const results = await query.searchPosts(word)
      return results.every((p) => !replyTxids.has(p.txid))
    },
    { label: 'post search reply exclusion' }
  )
})

test('every returned post contains the query substring', async () => {
  await forAll(
    (i) => postSetGen(),
    async ({ posts, parents }) => {
      const query = makeQuery(posts, parents, [], [])
      const word = WORDS[Math.floor(rng() * WORDS.length)]
      const results = await query.searchPosts(word)
      return results.every((p) => p.text.toLowerCase().includes(word.toLowerCase()))
    },
    { label: 'post search substring containment' }
  )
})

test('empty and whitespace queries return no posts', async () => {
  await forAll(
    (i) => postSetGen(),
    async ({ posts, parents }) => {
      const query = makeQuery(posts, parents, [], [])
      const empty = await query.searchPosts('')
      const whitespace = await query.searchPosts('   ')
      return empty.length === 0 && whitespace.length === 0
    },
    { label: 'empty post query' }
  )
})

test('every returned profile matches by name or bio', async () => {
  await forAll(
    (i) => profileSetGen(),
    async ({ names, profiles }) => {
      const query = makeQuery([], [], names, profiles)
      const word = WORDS[Math.floor(rng() * WORDS.length)]
      const results = await query.searchProfiles(word)
      return results.every((p) => {
        const nameMatch = p.name && p.name.toLowerCase().includes(word.toLowerCase())
        const textMatch = p.text && p.text.toLowerCase().includes(word.toLowerCase())
        return nameMatch || textMatch
      })
    },
    { label: 'profile search name/bio matching' }
  )
})

test('empty and whitespace queries return no profiles', async () => {
  await forAll(
    (i) => profileSetGen(),
    async ({ names, profiles }) => {
      const query = makeQuery([], [], names, profiles)
      const empty = await query.searchProfiles('')
      const whitespace = await query.searchProfiles('   ')
      return empty.length === 0 && whitespace.length === 0
    },
    { label: 'empty profile query' }
  )
})
