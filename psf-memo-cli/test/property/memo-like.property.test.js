/*
  Property test for the memo-like flag validation.

  A tip is acceptable exactly when it is a non-negative integer of zero sats (no
  tip) or at least the 600-sat dust floor and at most the 1-BCH maximum, and an
  author address is present whenever a tip is set. The spendable-sat sum must
  match the UTXO values regardless of the field name the wallet adapter uses.
  Both are sampled with a seeded generator.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import {
  parseLikeFlags,
  spendableSats,
  DUST_TIP_SATS,
  MAX_TIP_SATS
} from '../../src/lib/memo-like.js'
import { UsageError } from '../../src/lib/reporter.js'

const POST = 'a'.repeat(64)
const AUTHOR = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

test('a tip is accepted exactly at zero or within the dust..maximum window', () => {
  const rng = seededRandom(20261015)

  for (let i = 0; i < 300; i++) {
    const tip = Math.floor(rng() * 200000000) - 1000
    const acceptable = tip === 0 || (tip >= DUST_TIP_SATS && tip <= MAX_TIP_SATS)

    let parsed
    let err
    try {
      parsed = parseLikeFlags({ txid: POST, tip: String(tip), author: AUTHOR })
    } catch (e) {
      err = e
    }

    if (acceptable) {
      assert.equal(err, undefined)
      assert.equal(parsed.tipSats, tip)
    } else {
      assert.ok(err instanceof UsageError)
    }
  }
})

test('spendable sats sum the wallet UTXO values across adapter shapes', () => {
  const rng = seededRandom(20261016)
  const fields = ['value', 'satoshis', 'amount']

  for (let i = 0; i < 200; i++) {
    const count = 1 + Math.floor(rng() * 5)
    const utxos = []
    let expected = 0
    for (let j = 0; j < count; j++) {
      const value = Math.floor(rng() * 100000)
      const field = fields[Math.floor(rng() * fields.length)]
      utxos.push({ [field]: value })
      expected += value
    }

    const asStore = { utxos: { utxoStore: { bchUtxos: utxos } } }
    const asArray = { utxos }

    assert.equal(spendableSats(asStore), expected)
    assert.equal(spendableSats(asArray), expected)
  }
})
