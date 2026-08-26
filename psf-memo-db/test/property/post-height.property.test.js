/*
  Property tests for the postHeights secondary index key encoding.

  The postHeights index stores a key of `<padded-height>:<txid>`. Efficient
  pagination depends on two invariants that unit tests only probe at a few
  fixed heights:

    - round-trip: txidFromPostHeight(postHeightKey(h, txid)) recovers txid.
    - ordering: padded heights preserve numeric order lexicographically, so a
      reverse iterate over the keys yields newest posts first.
*/

import test from 'node:test'

import { seededRandom, forAll, intGen, txidGen } from './harness.js'
import PostQuery from '../../src/adapters/post-query.js'

const rng = seededRandom(20260826)

test('postHeightKey round-trips the txid for a broad range of heights', async () => {
  const heightGen = intGen(rng, 0, 9000000)
  const query = new PostQuery({
    postsDb: {},
    postHeightsDb: {},
    postParentsDb: {},
    postChildrenDb: {}
  })

  await forAll(
    (i) => ({ height: heightGen(), txid: txidGen(rng) }),
    ({ height, txid }) => {
      const key = PostQuery.postHeightKey(height, txid)
      const fromValue = query.txidFromPostHeight(key, { txid })
      const fromKey = query.txidFromPostHeight(key)
      return fromValue === txid && fromKey === txid
    },
    { label: 'postHeightKey round-trip' }
  )
})

test('padded heights preserve numeric order lexicographically', async () => {
  const heightGen = intGen(rng, 0, 9000000)

  await forAll(
    (i) => {
      const a = heightGen()
      const b = heightGen()
      return { a: Math.min(a, b), b: Math.max(a, b), txidA: txidGen(rng), txidB: txidGen(rng) }
    },
    ({ a, b, txidA, txidB }) => {
      if (a === b) return PostQuery.postHeightKey(a, txidA) === PostQuery.postHeightKey(a, txidB)
      return PostQuery.postHeightKey(a, txidA) < PostQuery.postHeightKey(b, txidB)
    },
    { label: 'postHeight key ordering' }
  )
})

test('padded heights are fixed width and equal to their numeric value', async () => {
  const heightGen = intGen(rng, 0, 999999999999)

  await forAll(
    (i) => heightGen(),
    (height) => {
      const padded = PostQuery.padHeight(height)
      return padded.length === 12 && Number.parseInt(padded, 10) === height
    },
    { label: 'postHeight fixed-width padding' }
  )
})
