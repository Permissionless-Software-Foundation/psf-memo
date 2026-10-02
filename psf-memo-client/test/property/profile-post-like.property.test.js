/*
  Property tests for the interactive like state.

  The unit tests probe initialLikeState / reflectLike / selectLikeState /
  applyLike at a few fixed fixtures. These properties pin the invariants over
  broad random inputs:

    - initialLikeState is always unliked and reports the post's numeric like
      count (zero for a missing post or count).
    - reflectLike always marks the post liked, raises the count by exactly one,
      returns a fresh object, and never mutates its input.
    - selectLikeState returns the stored state when the likes map holds one,
      and otherwise equals initialLikeState.
    - applyLike folds exactly one like into a fresh copy of the map: the target
      is liked with count raised by one, every other entry is preserved, and
      the original map is untouched. Applying a second like increments again.
    - Applying the same like twice to the same map is deterministic.

  All generation is seeded, so runs are reproducible.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen, randomFrom } = require('./harness')
const {
  initialLikeState,
  reflectLike,
  selectLikeState,
  applyLike
} = require('../../src/services/profile-post-like')

const rng = seededRandom(20261002)

const HEX = '0123456789abcdef'

function randomTxid () {
  return randomFrom(rng, HEX, 64, 64)
}

// A like count fixture: numbers, numeric strings, zero, and missing values.
function randomCount () {
  const kind = intGen(rng, 0, 5)()
  if (kind === 0) return 0
  if (kind === 1) return intGen(rng, 1, 1000000)()
  if (kind === 2) return String(intGen(rng, 0, 100000)())
  if (kind === 3) return undefined
  if (kind === 4) return null
  return -intGen(rng, 1, 100)()
}

function randomLikes (entries) {
  const likes = {}
  for (let i = 0; i < entries; i++) {
    likes[randomTxid()] = { liked: rng() < 0.5, count: intGen(rng, 0, 1000)() }
  }
  return likes
}

test('initialLikeState is unliked with the post numeric count', async () => {
  await forAll(
    () => ({ txid: randomTxid(), likeCount: randomCount() }),
    async (post) => {
      const state = initialLikeState(post)
      return state.liked === false &&
        state.count === (Number(post.likeCount) || 0) &&
        Number.isInteger(state.count)
    },
    { label: 'initial like state', samples: 2000 }
  )
})

test('initialLikeState treats a missing post as unliked with zero count', async () => {
  await forAll(
    () => [null, undefined, {}][intGen(rng, 0, 2)()],
    async (post) => {
      const state = initialLikeState(post)
      return state.liked === false && state.count === 0
    },
    { label: 'initial like state missing post', samples: 500 }
  )
})

test('reflectLike marks liked and raises the count by one without mutating', async () => {
  await forAll(
    () => ({ liked: rng() < 0.5, count: intGen(rng, 0, 1000000)() }),
    async (state) => {
      const before = { ...state }
      const next = reflectLike(state)
      return next !== state &&
        next.liked === true &&
        next.count === state.count + 1 &&
        state.liked === before.liked &&
        state.count === before.count
    },
    { label: 'reflect like', samples: 2000 }
  )
})

test('selectLikeState prefers a stored state and otherwise initializes', async () => {
  await forAll(
    () => {
      const post = { txid: randomTxid(), likeCount: randomCount() }
      const likes = randomLikes(intGen(rng, 0, 3)())
      let stored = null
      if (rng() < 0.5) {
        stored = { liked: rng() < 0.5, count: intGen(rng, 0, 1000)() }
        likes[post.txid] = stored
      }
      return { post, likes, stored }
    },
    async ({ post, likes, stored }) => {
      const state = selectLikeState(likes, post)
      if (stored) return state === stored
      return state.liked === false && state.count === (Number(post.likeCount) || 0)
    },
    { label: 'select like state', samples: 2000 }
  )
})

test('applyLike folds exactly one like into a fresh copy of the map', async () => {
  await forAll(
    () => {
      const post = { txid: randomTxid(), likeCount: randomCount() }
      const likes = randomLikes(intGen(rng, 0, 4)())
      return { post, likes, before: JSON.parse(JSON.stringify(likes)) }
    },
    async ({ post, likes, before }) => {
      const prior = selectLikeState(likes, post)
      const next = applyLike(likes, post)
      if (next === likes) return false
      if (next[post.txid].liked !== true) return false
      if (next[post.txid].count !== prior.count + 1) return false
      if (JSON.stringify(likes) !== JSON.stringify(before)) return false
      for (const key of Object.keys(likes)) {
        if (key !== post.txid && JSON.stringify(next[key]) !== JSON.stringify(likes[key])) return false
      }
      return true
    },
    { label: 'apply like', samples: 2000 }
  )
})

test('applyLike raises the count again for an already-liked post', async () => {
  await forAll(
    () => {
      const post = { txid: randomTxid(), likeCount: 0 }
      const likes = { [post.txid]: { liked: true, count: intGen(rng, 0, 1000)() } }
      return { post, likes }
    },
    async ({ post, likes }) => {
      const next = applyLike(likes, post)
      return next[post.txid].liked === true &&
        next[post.txid].count === likes[post.txid].count + 1
    },
    { label: 'apply like again', samples: 500 }
  )
})

test('applyLike is deterministic for the same inputs', async () => {
  await forAll(
    () => {
      const post = { txid: randomTxid(), likeCount: randomCount() }
      const likes = randomLikes(intGen(rng, 0, 3)())
      return { post, likes }
    },
    async ({ post, likes }) => {
      const first = applyLike(likes, post)
      const second = applyLike(likes, post)
      return JSON.stringify(first) === JSON.stringify(second)
    },
    { label: 'apply like determinism', samples: 500 }
  )
})
