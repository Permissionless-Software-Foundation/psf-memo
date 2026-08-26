/*
  Property tests for the indexer's postHeightKey encoding.

  The indexer writes the postHeights secondary index, and the DB reads it
  back by the same key scheme. These properties pin the encoding invariants:
  fixed-width zero-padded height, numeric-order preservation, and a stable
  key format shared with the DB.
*/

import test from 'node:test'

import { seededRandom, forAll, intGen, txidGen } from './harness.js'
import { postHeightKey } from '../../src/use-cases/action-types/helpers.js'

const rng = seededRandom(20260826)

test('postHeightKey is fixed-width and encodes the height and txid', async () => {
  const heightGen = intGen(rng, 0, 999999999999)

  await forAll(
    (i) => ({ height: heightGen(), txid: txidGen(rng) }),
    ({ height, txid }) => {
      const key = postHeightKey(height, txid)
      const [padded, txidPart] = key.split(':')
      return padded.length === 12 &&
        Number.parseInt(padded, 10) === height &&
        txidPart === txid
    },
    { label: 'postHeightKey fixed-width encoding' }
  )
})

test('postHeightKey preserves numeric height order lexicographically', async () => {
  const heightGen = intGen(rng, 0, 9000000)

  await forAll(
    (i) => {
      const a = heightGen()
      const b = heightGen()
      return { a: Math.min(a, b), b: Math.max(a, b), txidA: txidGen(rng), txidB: txidGen(rng) }
    },
    ({ a, b, txidA, txidB }) => {
      if (a === b) return postHeightKey(a, txidA) === postHeightKey(a, txidB)
      return postHeightKey(a, txidA) < postHeightKey(b, txidB)
    },
    { label: 'postHeightKey ordering' }
  )
})
