/*
  Property tests for the following-feed query scan.

  The unit tests probe scanFollowingFeedTxidsAndCount at a few fixed
  fixtures. These properties pin down invariants that hold over broad random
  record sets:

    - newest-first ordering: the feed is iterated by postHeights key order
      reversed, so returned posts are newest first.
    - reply exclusion: a reply is never returned as a top-level feed item.
    - viewer exclusion: the viewer's own posts are never returned.
    - membership: every returned post was authored by a followed address
      (ignoring the viewer in the follow list).
    - pagination conservation: applying offset/limit returns exactly the full
      matching set sliced to the page, and reports an exact total.
*/

import test from 'node:test'
import { seededRandom, forAll, intGen, txidGen } from './harness.js'
import PostQuery from '../../src/adapters/post-query.js'

const rng = seededRandom(20260901)

const VIEWER = 'bitcoincash:viewer'
const ADDRS = ['bitcoincash:viewer', 'bitcoincash:f1', 'bitcoincash:f2', 'bitcoincash:o1', 'bitcoincash:o2']

// In-memory postHeights store mirroring the LevelDB iterator contract
// (reverse ordering over the padded-height key string).
function makePostHeightsDb (entries) {
  const store = new Map(entries.map((e) => [e.key, e.value]))
  return {
    async * iterator (opts = {}) {
      const { reverse = false } = opts
      let keys = Array.from(store.keys()).sort()
      if (reverse) keys = keys.reverse()
      for (const key of keys) {
        yield [key, store.get(key)]
      }
    }
  }
}

function makePostsDb (posts) {
  const store = new Map(posts.map((p) => [p.txid, p]))
  return {
    async get (txid) {
      const post = store.get(txid)
      if (!post) {
        const err = new Error('not found')
        err.notFound = true
        throw err
      }
      return post
    }
  }
}

function makeParentsDb (replyTxids) {
  return {
    async * iterator () {
      for (const txid of replyTxids) {
        yield [txid, { parentTxid: 'parent' }]
      }
    }
  }
}

function makeQuery (postHeightsEntries, postsDb, replyTxids) {
  return new PostQuery({
    postsDb: makePostsDb(postsDb),
    postHeightsDb: makePostHeightsDb(postHeightsEntries),
    addrPostHeightsDb: {},
    postParentsDb: makeParentsDb(replyTxids),
    postChildrenDb: {},
    likesDb: {},
    postLikesDb: {}
  })
}

function fixtureGen () {
  return () => {
    const n = intGen(rng, 0, 14)()
    const posts = [] // every post exists in the DB
    const postHeights = [] // every post appears in the global index
    const replyTxids = new Set()

    for (let i = 0; i < n; i++) {
      const txid = txidGen(rng)
      const height = intGen(rng, 0, 9000000)()
      const addr = ADDRS[Math.floor(rng() * ADDRS.length)]
      const isReply = rng() < 0.3
      const dangling = rng() < 0.15 // in index but missing from posts DB
      const post = dangling
        ? null
        : {
            txid,
            addr,
            text: 'post ' + i,
            seen: intGen(rng, 0, 1000000)(),
            blockHeight: height
          }

      if (isReply) replyTxids.add(txid)
      postHeights.push({
        key: PostQuery.postHeightKey(height, txid),
        value: { txid }
      })
      // A dangling entry contributes no post record but stays in the index.
      if (!dangling) posts.push({ txid, ...post })
    }

    // A follow list may also include the viewer (which must be ignored).
    const followed = []
    const fCount = intGen(rng, 0, 6)()
    for (let i = 0; i < fCount; i++) {
      followed.push(ADDRS[Math.floor(rng() * ADDRS.length)])
    }

    return {
      postHeights,
      posts,
      replyTxids,
      followed,
      limit: intGen(rng, 1, 8)(),
      offset: intGen(rng, 0, 10)()
    }
  }
}

function buildExpected (query, posts, replyTxids, followed, { limit, offset }) {
  const followeeSet = new Set(followed.filter((a) => a !== VIEWER))
  const matching = posts
    .filter((p) => !replyTxids.has(p.txid))
    .filter((p) => followeeSet.has(p.addr))

  const ordered = [...matching].sort((a, b) => {
    const ka = PostQuery.postHeightKey(a.blockHeight, a.txid)
    const kb = PostQuery.postHeightKey(b.blockHeight, b.txid)
    return ka < kb ? 1 : ka > kb ? -1 : 0
  })

  return {
    total: ordered.length,
    txids: ordered.slice(offset, offset + limit).map((p) => p.txid)
  }
}

test('following-feed scan returns followed top-level posts newest first with an exact total', async () => {
  await forAll(
    fixtureGen(),
    async ({ postHeights, posts, replyTxids, followed, limit, offset }) => {
      const query = makeQuery(postHeights, posts, replyTxids)
      const { txids, total } = await query.scanFollowingFeedTxidsAndCount(
        VIEWER,
        followed,
        { limit, offset }
      )
      const expected = buildExpected(query, posts, replyTxids, followed, { limit, offset })

      return total === expected.total && JSON.stringify(txids) === JSON.stringify(expected.txids)
    },
    { label: 'following-feed pagination conservation and ordering' }
  )
})

test('following-feed scan never returns replies, the viewer, or un-followed authors', async () => {
  await forAll(
    fixtureGen(),
    async ({ postHeights, posts, replyTxids, followed, limit }) => {
      const query = makeQuery(postHeights, posts, replyTxids)
      const { txids } = await query.scanFollowingFeedTxidsAndCount(VIEWER, followed, { limit, offset: 0 })

      const postByTxid = new Map(posts.map((p) => [p.txid, p]))
      const followeeSet = new Set(followed.filter((a) => a !== VIEWER))

      return txids.every((txid) => {
        const post = postByTxid.get(txid)
        if (!post) return false
        if (replyTxids.has(txid)) return false
        if (post.addr === VIEWER) return false
        return followeeSet.has(post.addr)
      })
    },
    { label: 'following-feed reply/viewer/membership exclusion' }
  )
})
