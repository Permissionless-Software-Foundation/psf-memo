/*
  Property tests for the Memo like / tip behavior slices.

  The like/tip slice centers on a post txid encoded as a 64-character hex
  string. These tests assert useful invariants across a broad input range that
  unit tests cover only at a few fixed points:
    - hexToBytes round-trips any valid hex txid back to its canonical string.
    - hexToBytes rejects any string that is not a valid 64-char hex txid.
    - MemoLike.validate accepts any valid 64-char hex txid and rejects others.
    - getSpendableSats conserves the sum of every spendable utxo value.
*/

'use strict'

const test = require('node:test')

const { forAll, seededRandom } = require('./harness')
const { fakeWallet } = require('../helpers/fake-wallet')

const MemoLike = require('../../src/services/memo-like')
const { hexToBytes } = require('../../src/services/hex')

const rng = seededRandom(20260720)

// Build a random lowercase-hex string of the given byte length.
function hexString (bytes) {
  const out = []
  for (let i = 0; i < bytes; i++) {
    out.push(Math.floor(rng() * 256).toString(16).padStart(2, '0'))
  }
  return out.join('')
}

test('hexToBytes round-trips a valid hex txid back to its canonical string', async () => {
  await forAll(
    () => hexString(32),
    (hex) => Buffer.from(hexToBytes(hex, 32)).toString('hex') === hex,
    { label: 'hexToBytes round-trip' }
  )
})

test('hexToBytes rejects any string that is not a 64-character hex txid', async () => {
  await forAll(
    (i) => {
      const len = 1 + Math.floor(rng() * 100)
      if (len !== 64) return 'z'.repeat(len)
      // Exactly 64 chars but containing a non-hex character.
      return `z${'a'.repeat(63)}`
    },
    (input) => {
      try {
        hexToBytes(input, 32)
        return false
      } catch (err) {
        return err instanceof Error
      }
    },
    { label: 'hexToBytes rejects invalid' }
  )
})

test('MemoLike.validate accepts any valid 64-character hex post txid', async () => {
  await forAll(
    () => hexString(32),
    (txid) => {
      const result = new MemoLike({}).validate(txid)
      return result.ok === true
    },
    { label: 'valid txid accepted' }
  )
})

test('MemoLike.validate rejects a non-hex post txid with like_validation', async () => {
  await forAll(
    () => {
      // 64 chars drawn from g..z, guaranteed to be non-hex.
      const chars = []
      for (let i = 0; i < 64; i++) {
        chars.push(String.fromCharCode(103 + Math.floor(rng() * 20)))
      }
      return chars.join('')
    },
    (txid) => {
      try {
        new MemoLike({}).validate(txid)
        return false
      } catch (err) {
        return err.code === 'like_validation'
      }
    },
    { label: 'invalid txid rejected as like_validation' }
  )
})

test('getSpendableSats conserves the sum of every spendable utxo value', async () => {
  await forAll(
    (i) => {
      const fields = ['value', 'satoshis', 'amount']
      const count = 1 + Math.floor(rng() * 8)
      const utxos = []
      for (let k = 0; k < count; k++) {
        utxos.push({ [fields[k % 3]]: Math.floor(rng() * 1000000) })
      }
      return utxos
    },
    (utxos) => {
      const wallet = fakeWallet({ utxos })
      const expected = utxos.reduce(
        (sum, u) => sum + (u.value ?? u.satoshis ?? u.amount ?? 0),
        0
      )
      return new MemoLike({ wallet }).getSpendableSats() === expected
    },
    { label: 'spendable sum conservation' }
  )
})
