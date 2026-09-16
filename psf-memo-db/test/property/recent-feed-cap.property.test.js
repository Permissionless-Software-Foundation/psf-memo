/*
  Property tests for the recent-feed total cap.

  The unit tests cover scanRecentPostTxidsAndCount at fixed sizes. These
  properties pin the capped-total and bounded-scan invariants over broad random
  corpora:

    - capped total: `total` is min(eligible top-level posts, totalScanCap).
    - pagination conservation: txids are the newest-first eligible slice for
      offset/limit when every indexed entry is eligible.
    - bounded raw scan: at most offset + limit + totalScanCap postHeights
      entries are read, so the total scan stays bounded as the corpus grows.
    - default cap: with no explicit totalScanCap, corpora below the cap report
      an exact total (regression guard for the 10 -> 500 change).
    - reply exclusion: replies never appear in txids and never count.

  All generation is seeded, so runs are reproducible.
*/

import test from 'node:test'
import { seededRandom, forAll, intGen, txidGen } from './harness.js'
import PostQuery from '../../src/adapters/post-query.js'

const rng = seededRandom(20260916)

// In-memory postHeights store mirroring the LevelDB iterator contract
// (reverse ordering over the padded-height key string). `counter.reads` counts
// entries actually produced by the iterator, so a bounded scan is observable.
function makePostHeightsDb (entries, counter) {
  const store = new Map(entries.map((e) => [e.key, e.value]))
  return {
    async * iterator (opts = {}) {
      const { reverse = false } = opts
      let keys = Array.from(store.keys()).sort()
      if (reverse) keys = keys.reverse()
      for (const key of keys) {
        counter.reads++
        yield [key, store.get(key)]
      }
    }
  }
}

function makeParentsDb (replyTxids) {
  return {
    async get (txid) {
      if (replyTxids.has(txid)) return { parentTxid: 'parent', childTxid: txid }
      const err = new Error('not found')
      err.notFound = true
      throw err
    }
  }
}

function makeQuery (postHeights, replyTxids, counter) {
  return new PostQuery({
    postsDb: {},
    postHeightsDb: makePostHeightsDb(postHeights, counter),
    addrPostHeightsDb: {},
    postParentsDb: makeParentsDb(replyTxids),
    postChildrenDb: {},
    likesDb: {},
    postLikesDb: {}
  })
}

function orderedTxids (postHeights) {
  return [...postHeights]
    .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0))
    .map((e) => e.value.txid)
}

// All-eligible corpus: every indexed entry is a top-level post, so the scan
// reads exactly offset + limit + cap entries (or the whole index if smaller).
function topLevelGen () {
  return () => {
    const n = intGen(rng, 0, 25)()
    const postHeights = []
    for (let i = 0; i < n; i++) {
      const txid = txidGen(rng)
      const height = intGen(rng, 0, 9000000)()
      postHeights.push({ key: PostQuery.postHeightKey(height, txid), value: { txid } })
    }
    return {
      n,
      postHeights,
      limit: intGen(rng, 1, 8)(),
      offset: intGen(rng, 0, 12)(),
      cap: intGen(rng, 1, 12)()
    }
  }
}

test('recent-feed scan caps the total and conserves the newest-first page', async () => {
  await forAll(
    topLevelGen(),
    async ({ n, postHeights, limit, offset, cap }) => {
      const counter = { reads: 0 }
      const query = makeQuery(postHeights, new Set(), counter)
      const { txids, total } = await query.scanRecentPostTxidsAndCount({ limit, offset, totalScanCap: cap })

      const ordered = orderedTxids(postHeights)
      const expectedTxids = ordered.slice(offset, offset + limit)
      const expectedTotal = Math.min(n, cap)

      return total === expectedTotal && JSON.stringify(txids) === JSON.stringify(expectedTxids)
    },
    { label: 'recent-feed capped-total and pagination conservation' }
  )
})

test('recent-feed scan reads at most offset + limit + cap postHeights entries', async () => {
  await forAll(
    topLevelGen(),
    async ({ n, postHeights, limit, offset, cap }) => {
      const counter = { reads: 0 }
      const query = makeQuery(postHeights, new Set(), counter)
      await query.scanRecentPostTxidsAndCount({ limit, offset, totalScanCap: cap })

      return counter.reads === Math.min(n, offset + limit + cap)
    },
    { label: 'recent-feed bounded raw scan' }
  )
})

test('recent-feed scan defaults to a cap larger than the old cap of 10', async () => {
  await forAll(
    topLevelGen(),
    async ({ n, postHeights, limit, offset }) => {
      const counter = { reads: 0 }
      const query = makeQuery(postHeights, new Set(), counter)
      const { total } = await query.scanRecentPostTxidsAndCount({ limit, offset })

      // No explicit cap: corpora up to 25 report an exact total. This fails if
      // the default cap regresses to 10.
      return total === n
    },
    { label: 'recent-feed default cap', samples: 200 }
  )
})

test('recent-feed scan excludes replies from the page and the count', async () => {
  const mixedGen = () => {
    const n = intGen(rng, 0, 20)()
    const postHeights = []
    const replyTxids = new Set()
    let topLevel = 0
    for (let i = 0; i < n; i++) {
      const txid = txidGen(rng)
      const height = intGen(rng, 0, 9000000)()
      const isReply = rng() < 0.4
      if (isReply) replyTxids.add(txid)
      else topLevel++
      postHeights.push({ key: PostQuery.postHeightKey(height, txid), value: { txid } })
    }
    return {
      topLevel,
      postHeights,
      replyTxids,
      limit: intGen(rng, 1, 8)(),
      offset: intGen(rng, 0, 10)(),
      cap: intGen(rng, 1, 10)()
    }
  }

  await forAll(
    mixedGen,
    async ({ topLevel, postHeights, replyTxids, limit, offset, cap }) => {
      const counter = { reads: 0 }
      const query = makeQuery(postHeights, replyTxids, counter)
      const { txids, total } = await query.scanRecentPostTxidsAndCount({ limit, offset, totalScanCap: cap })

      if (txids.some((txid) => replyTxids.has(txid))) return false
      if (txids.length > limit) return false
      if (total > Math.min(topLevel, cap)) return false

      // Returned txids follow newest-first key order.
      const ordered = orderedTxids(postHeights)
      let cursor = -1
      for (const txid of txids) {
        const next = ordered.indexOf(txid)
        if (next <= cursor) return false
        cursor = next
      }
      return true
    },
    { label: 'recent-feed reply exclusion and cap upper bound' }
  )
})
