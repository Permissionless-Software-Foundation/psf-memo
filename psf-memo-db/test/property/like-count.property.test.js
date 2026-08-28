/*
  Property tests for the like-count read side.

  The like-count feature attaches a likeCount to every post returned by the
  list and thread use cases. These properties pin down the invariants that
  unit tests only probe at a few fixed fixtures:

    - conservation: buildLikeCountMap counts exactly the likes whose post
      exists in the posts store, ignoring orphaned likes.
    - round-trip: attachLikeCounts adds likeCount without mutating or
      dropping any input post.
    - pagination: assemblePostPage preserves pagination metadata and computes
      hasMore from the offset, page size, and total.
*/

import test from 'node:test'

import { seededRandom, forAll, intGen, txidGen } from './harness.js'
import PostQuery from '../../src/adapters/post-query.js'
import { attachLikeCounts, assemblePostPage } from '../../src/use-cases/lib/pagination.js'

const rng = seededRandom(20260827)

// A posts store that returns a post by txid or throws a notFound error.
function mockPostsDb (posts) {
  return {
    async get (txid) {
      if (posts[txid]) return posts[txid]
      const err = new Error('not found')
      err.notFound = true
      throw err
    }
  }
}

// A postLikes store that iterates [key, postLike] pairs keyed as postTxid:likeTxid.
function mockPostLikesDb (likes) {
  return {
    async * iterator () {
      for (const like of likes) {
        yield [`${like.postTxid}:${like.txid}`, like]
      }
    }
  }
}

function makeQuery (posts, likes) {
  return new PostQuery({
    postsDb: mockPostsDb(posts),
    postLikesDb: mockPostLikesDb(likes),
    postHeightsDb: {},
    addrPostHeightsDb: {},
    postParentsDb: {},
    postChildrenDb: {},
    likesDb: {}
  })
}

test('buildLikeCountMap counts likes per existing post and ignores orphans', async () => {
  await forAll(
    (i) => {
      const postCount = intGen(rng, 0, 8)()
      const likeCount = intGen(rng, 0, 20)()
      const posts = {}
      for (let p = 0; p < postCount; p++) {
        const txid = txidGen(rng)
        posts[txid] = { txid, addr: 'addr', text: 't', seen: 1, blockHeight: 1 }
      }
      const postTxids = Object.keys(posts)
      const likes = []
      for (let l = 0; l < likeCount; l++) {
        const postTxid = postTxids.length
          ? postTxids[intGen(rng, 0, postTxids.length - 1)()]
          : txidGen(rng)
        likes.push({ txid: txidGen(rng), postTxid })
      }
      return { posts, likes }
    },
    async ({ posts, likes }) => {
      const counts = await makeQuery(posts, likes).buildLikeCountMap()

      const expected = new Map()
      for (const like of likes) {
        if (!posts[like.postTxid]) continue
        expected.set(like.postTxid, (expected.get(like.postTxid) || 0) + 1)
      }

      if (counts.size !== expected.size) return false
      for (const [txid, count] of expected) {
        if (counts.get(txid) !== count) return false
      }
      return true
    },
    { label: 'buildLikeCountMap conservation' }
  )
})

test('attachLikeCounts adds likeCount without mutating or dropping posts', async () => {
  await forAll(
    (i) => {
      const n = intGen(rng, 0, 10)()
      const posts = []
      for (let p = 0; p < n; p++) {
        posts.push({ txid: txidGen(rng), text: 'hello', seen: p, blockHeight: p })
      }
      const likeCounts = new Map()
      for (const post of posts) {
        if (rng() < 0.5) likeCounts.set(post.txid, intGen(rng, 0, 100)())
      }
      return { posts, likeCounts }
    },
    ({ posts, likeCounts }) => {
      const result = attachLikeCounts(posts, likeCounts)
      if (result.length !== posts.length) return false
      for (let i = 0; i < posts.length; i++) {
        if (result[i].likeCount !== (likeCounts.get(posts[i].txid) ?? 0)) return false
        if (result[i].txid !== posts[i].txid) return false
        if (result[i].text !== posts[i].text) return false
        if (result[i].seen !== posts[i].seen) return false
      }
      return true
    },
    { label: 'attachLikeCounts round-trip' }
  )
})

test('assemblePostPage preserves pagination metadata and computes hasMore', async () => {
  await forAll(
    (i) => {
      const n = intGen(rng, 0, 10)()
      const posts = []
      for (let p = 0; p < n; p++) {
        posts.push({ txid: txidGen(rng), text: 'x', seen: p, blockHeight: p })
      }
      return {
        posts,
        total: intGen(rng, 0, 50)(),
        limit: intGen(rng, 1, 20)(),
        offset: intGen(rng, 0, 30)()
      }
    },
    ({ posts, total, limit, offset }) => {
      const page = assemblePostPage({
        posts,
        replyCounts: new Map(),
        likeCounts: new Map(),
        total,
        limit,
        offset
      })
      if (page.pagination.limit !== limit) return false
      if (page.pagination.offset !== offset) return false
      if (page.pagination.total !== total) return false
      if (page.pagination.hasMore !== (offset + posts.length < total)) return false
      if (page.posts.length !== posts.length) return false
      return true
    },
    { label: 'assemblePostPage hasMore' }
  )
})
