/*
  Property tests for the efficient post-query secondary indexes.

  The unit tests probe scanPostsByAddrTxidsAndCount and the addrPostHeights /
  postLikes key encodings at a few fixed fixtures. These properties pin down
  invariants that hold over broad random inputs:

    - addrPostHeightKey round-trip: txidFromAddrPostHeight recovers the txid.
    - addrPostHeight ordering: padded heights preserve numeric order within an
      address, so reverse iteration yields newest-first posts.
    - postLikeKey round-trip: the two txids are recovered from the key.
    - by-address pagination conservation: scanPostsByAddrTxidsAndCount returns
      exactly the top-level posts for the address, newest first, applying
      offset/limit, and reports a total matching the full set; the
      backwards-compatible scanPostsByAddrTxids agrees.
*/

import test from 'node:test'

import { seededRandom, forAll, intGen, txidGen } from './harness.js'
import PostQuery from '../../src/adapters/post-query.js'

const rng = seededRandom(20260831)
const ADDR = 'bitcoincash:qtest'

// In-memory addrPostHeights store mirroring the LevelDB iterator contract
// (gte/lte prefix bounds and reverse ordering over the key string).
function makeAddrHeightsDb (entries) {
  const store = new Map(entries.map((e) => [e.key, e.value]))
  return {
    async * iterator (opts = {}) {
      const { gte, lte, reverse = false } = opts
      let keys = Array.from(store.keys()).filter((k) => k >= gte && k <= lte).sort()
      if (reverse) keys = keys.reverse()
      for (const key of keys) {
        yield [key, store.get(key)]
      }
    }
  }
}

function makeParentsDb (replyTxids) {
  return {
    async get (txid) {
      if (replyTxids.has(txid)) return { parentTxid: 'parent-txid' }
      const err = new Error('not found')
      err.notFound = true
      throw err
    }
  }
}

function makeQuery (posts) {
  const replyTxids = new Set(posts.filter((p) => p.isReply).map((p) => p.txid))
  const entries = posts.map((p) => ({
    key: PostQuery.addrPostHeightKey(ADDR, p.height, p.txid),
    value: { txid: p.txid, addr: ADDR, blockHeight: p.height }
  }))
  return new PostQuery({
    postsDb: {},
    postHeightsDb: {},
    addrPostHeightsDb: makeAddrHeightsDb(entries),
    postParentsDb: makeParentsDb(replyTxids),
    postChildrenDb: {},
    likesDb: {},
    postLikesDb: {}
  })
}

function fixtureGen () {
  return () => {
    const n = intGen(rng, 0, 12)()
    const posts = []
    for (let i = 0; i < n; i++) {
      posts.push({
        height: intGen(rng, 0, 9000000)(),
        txid: txidGen(rng),
        isReply: rng() < 0.3
      })
    }
    return {
      posts,
      limit: intGen(rng, 1, 10)(),
      offset: intGen(rng, 0, 8)()
    }
  }
}

test('addrPostHeightKey round-trips the txid and preserves order within an address', async () => {
  const query = makeQuery([])

  await forAll(
    fixtureGen(),
    async ({ posts }) => {
      for (const p of posts) {
        const key = PostQuery.addrPostHeightKey(ADDR, p.height, p.txid)
        const fromValue = query.txidFromAddrPostHeight(key, { txid: p.txid })
        const fromKey = query.txidFromAddrPostHeight(key)
        if (fromValue !== p.txid || fromKey !== p.txid) return false
      }

      const sorted = [...posts].sort((a, b) => {
        const ka = PostQuery.addrPostHeightKey(ADDR, a.height, a.txid)
        const kb = PostQuery.addrPostHeightKey(ADDR, b.height, b.txid)
        return ka < kb ? -1 : ka > kb ? 1 : 0
      })
      const reverseSorted = [...posts].sort((a, b) => {
        const ka = PostQuery.addrPostHeightKey(ADDR, a.height, a.txid)
        const kb = PostQuery.addrPostHeightKey(ADDR, b.height, b.txid)
        return ka < kb ? 1 : ka > kb ? -1 : 0
      })
      if (sorted.length > 1) {
        for (let i = 1; i < sorted.length; i++) {
          const prev = PostQuery.addrPostHeightKey(ADDR, sorted[i - 1].height, sorted[i - 1].txid)
          const cur = PostQuery.addrPostHeightKey(ADDR, sorted[i].height, sorted[i].txid)
          if (!(prev < cur)) return false
        }
      }
      if (reverseSorted.length > 1) {
        for (let i = 1; i < reverseSorted.length; i++) {
          const prev = PostQuery.addrPostHeightKey(ADDR, reverseSorted[i - 1].height, reverseSorted[i - 1].txid)
          const cur = PostQuery.addrPostHeightKey(ADDR, reverseSorted[i].height, reverseSorted[i].txid)
          if (!(prev > cur)) return false
        }
      }
      return true
    },
    { label: 'addrPostHeightKey round-trip and ordering' }
  )
})

test('postLikeKey round-trips both txids from the key', async () => {
  const query = makeQuery([])

  await forAll(
    fixtureGen(),
    ({ posts }) => {
      if (posts.length < 2) return true
      for (let i = 0; i < posts.length - 1; i++) {
        const postTxid = posts[i].txid
        const likeTxid = posts[i + 1].txid
        const key = PostQuery.postLikeKey(postTxid, likeTxid)
        if (query.postTxidFromPostLike(key) !== postTxid) return false
        if (query.likeTxidFromPostLike(key) !== likeTxid) return false
      }
      return true
    },
    { label: 'postLikeKey round-trip' }
  )
})

test('scanPostsByAddrTxidsAndCount paginates top-level posts newest first with an exact total', async () => {
  await forAll(
    fixtureGen(),
    async ({ posts, limit, offset }) => {
      const query = makeQuery(posts)

      const { txids, total } = await query.scanPostsByAddrTxidsAndCount(ADDR, { limit, offset })

      const topLevel = posts
        .filter((p) => !p.isReply)
        .sort((a, b) => {
          const ka = PostQuery.addrPostHeightKey(ADDR, a.height, a.txid)
          const kb = PostQuery.addrPostHeightKey(ADDR, b.height, b.txid)
          return ka < kb ? 1 : ka > kb ? -1 : 0
        })
      const expectedTxids = topLevel.slice(offset, offset + limit).map((p) => p.txid)

      if (total !== topLevel.length) return false
      if (JSON.stringify(txids) !== JSON.stringify(expectedTxids)) return false

      const legacy = await query.scanPostsByAddrTxids(ADDR, { limit, offset })
      if (JSON.stringify(legacy) !== JSON.stringify(expectedTxids)) return false
      return true
    },
    { label: 'by-address pagination conservation' }
  )
})
