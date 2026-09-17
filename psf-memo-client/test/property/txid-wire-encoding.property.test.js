/*
  Property tests for Memo txid wire encoding.

  Unit tests pin the wire bytes of a few fixed txids. These properties pin the
  encoding invariants over broad random inputs:

    - Round trip: reversing the wire bytes recovers the display bytes, and
      reversing twice is the identity.
    - Wire order: the encoded bytes are exactly the reverse of the display
      txid's bytes.
    - Payload shape: a txid-and-text payload starts with the wire txid and
      ends with the UTF-8 text, with no bytes added or dropped.
    - Determinism: the same txid always encodes to the same bytes.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { seededRandom, forAll, intGen } = require('./harness')
const { txidToWireBytes, buildTxidTextPushes } = require('../../src/services/hex')

const HEX_CHARS = '0123456789abcdef'

function randomTxid (rng) {
  let out = ''
  for (let i = 0; i < 64; i++) {
    out += HEX_CHARS[Math.floor(rng() * HEX_CHARS.length)]
  }
  return out
}

function randomText (rng) {
  const alphabet = 'abc XYZ!\u00e9\u4e2d\ud83d\ude00'
  let out = ''
  const length = intGen(rng, 0, 24)()
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(rng() * alphabet.length)]
  }
  return out
}

test('txid wire bytes are the byte reverse of the display txid', async () => {
  const rng = seededRandom(20260916)

  await forAll(
    () => randomTxid(rng),
    (txid) => {
      const wire = Buffer.from(txidToWireBytes(txid)).toString('hex')
      const expected = Buffer.from(txid, 'hex').reverse().toString('hex')
      return wire === expected
    },
    { label: 'txidToWireBytes byte order' }
  )
})

test('reversing wire bytes twice recovers the display txid', async () => {
  const rng = seededRandom(20260917)

  await forAll(
    () => randomTxid(rng),
    (txid) => {
      const bytes = txidToWireBytes(txid)
      return Buffer.from(Buffer.from(bytes).reverse()).toString('hex') === txid
    },
    { label: 'txidToWireBytes round trip' }
  )
})

test('txid encoding is deterministic', async () => {
  const rng = seededRandom(20260918)

  await forAll(
    () => randomTxid(rng),
    (txid) => {
      const first = Buffer.from(txidToWireBytes(txid)).toString('hex')
      const second = Buffer.from(txidToWireBytes(txid)).toString('hex')
      return first === second
    },
    { label: 'txidToWireBytes determinism' }
  )
})

test('payload embeds the wire txid followed by the UTF-8 text', async () => {
  const rng = seededRandom(20260919)

  await forAll(
    () => ({ txid: randomTxid(rng), text: randomText(rng) }),
    ({ txid, text }) => {
      const pushes = buildTxidTextPushes(txid, text)
      const buf = Buffer.concat(pushes.map((p) => Buffer.from(p)))
      const wire = Buffer.from(txidToWireBytes(txid)).toString('hex')
      const expectedText = Buffer.from(text, 'utf8')

      if (buf.length !== 32 + expectedText.length) return false
      if (buf.subarray(0, 32).toString('hex') !== wire) return false
      return buf.subarray(32).equals(expectedText)
    },
    { label: 'buildTxidTextPushes shape' }
  )
})

test('a reply payload rejects an invalid txid with the parent label', () => {
  assert.throws(
    () => buildTxidTextPushes('not-a-txid', 'hi', 'Parent txid'),
    /Parent txid must be a 64-character hex string/
  )
})
