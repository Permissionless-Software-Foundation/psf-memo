/*
  Property tests for the Memo protocol wire-encoding helpers.

  Unit tests pin a few fixed vectors. These properties pin the encoding
  invariants over broad random inputs:

    - Wire order: the encoded txid bytes are exactly the reverse of the display
      txid's bytes.
    - Round trip: reversing the wire bytes recovers the display txid.
    - Display order: a cash address decodes back to the same 20 hash160 bytes it
      was encoded from (the hash is not byte-reversed).
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import cashaddr from 'ecashaddrjs'
import { seededRandom, forAll } from './harness.js'
import {
  txidToWireBytes,
  addressToHash160
} from '../../src/lib/wire-encoding.js'

const HEX_CHARS = '0123456789abcdef'

function randomTxid (rng) {
  let out = ''
  for (let i = 0; i < 64; i++) {
    out += HEX_CHARS[Math.floor(rng() * HEX_CHARS.length)]
  }
  return out
}

function randomHash160 (rng) {
  const bytes = Buffer.alloc(20)
  for (let i = 0; i < 20; i++) {
    bytes[i] = Math.floor(rng() * 256)
  }
  return bytes
}

test('txid wire bytes are the byte reverse of the display txid', async () => {
  const rng = seededRandom(20261009)

  await forAll(
    () => randomTxid(rng),
    (txid) => {
      const wire = txidToWireBytes(txid).toString('hex')
      const expected = Buffer.from(txid, 'hex').reverse().toString('hex')
      return wire === expected
    },
    { label: 'txidToWireBytes byte order' }
  )
})

test('reversing wire bytes twice recovers the display txid', async () => {
  const rng = seededRandom(20261010)

  await forAll(
    () => randomTxid(rng),
    (txid) => Buffer.from(txidToWireBytes(txid)).reverse().toString('hex') === txid,
    { label: 'txidToWireBytes round trip' }
  )
})

test('addressToHash160 round-trips a random hash160 in display order', async () => {
  const rng = seededRandom(20261011)

  await forAll(
    () => randomHash160(rng),
    (hash) => {
      const addr = cashaddr.encode('bitcoincash', 'P2PKH', new Uint8Array(hash))
      const decoded = addressToHash160(addr)
      return decoded.length === 20 && decoded.equals(hash)
    },
    { label: 'addressToHash160 round trip' }
  )
})

test('txidToWireBytes rejects every malformed hex input', () => {
  const rng = seededRandom(20261012)

  const malformed = []
  // Wrong length: 0..62 characters of valid hex.
  for (let i = 0; i < 200; i++) {
    const length = Math.floor(rng() * 63)
    let value = ''
    for (let j = 0; j < length; j++) {
      value += HEX_CHARS[Math.floor(rng() * HEX_CHARS.length)]
    }
    malformed.push(value)
  }
  // Right length, one non-hex character at a random position.
  for (let i = 0; i < 200; i++) {
    const at = Math.floor(rng() * 64)
    const value = randomTxid(rng)
    malformed.push(`${value.slice(0, at)}z${value.slice(at + 1)}`)
  }

  for (const value of malformed) {
    assert.throws(() => txidToWireBytes(value), /Txid/, `should reject ${value}`)
  }
})
