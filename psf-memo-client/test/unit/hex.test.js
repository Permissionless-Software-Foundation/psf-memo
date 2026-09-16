/*
  Unit tests for the hex helpers used by Memo poll actions.

  Memo actions that embed a parent poll txid use hexToBytes to decode the
  64-character hex txid into 32 raw bytes. These direct tests pin the length
  and hex-validity guards independently of the memo-poll broadcast path that
  also reaches hexToBytes through buildTxidTextPayload.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { hexToBytes, buildTxidTextPayload, txidToWireBytes } = require('../../src/services/hex')

// A non-palindromic txid so a missing byte reversal is observable.
const DISPLAY_TXID = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const WIRE_HEX = 'efcdab8967452301efcdab8967452301efcdab8967452301efcdab8967452301'

test('hexToBytes decodes exactly 64 hex characters into 32 bytes', () => {
  const bytes = hexToBytes('ab'.repeat(32))

  assert.ok(bytes instanceof Uint8Array)
  assert.equal(bytes.length, 32)
  assert.equal(bytes[0], 0xab)
})

test('hexToBytes rejects a string of the wrong length', () => {
  // 60 characters: the correct string type but not the required 64.
  assert.throws(
    () => hexToBytes('ab'.repeat(30)),
    /64-character hex string/
  )
  // 128 characters: over-length.
  assert.throws(
    () => hexToBytes('ab'.repeat(64)),
    /64-character hex string/
  )
})

test('hexToBytes rejects a non-hex character', () => {
  // 64 characters, but 'z' and 'g' are not valid hex digits.
  assert.throws(
    () => hexToBytes('zz'.repeat(32)),
    /valid hex string/
  )
  assert.throws(
    () => hexToBytes('gg'.repeat(32)),
    /valid hex string/
  )
})

test('hexToBytes rejects a non-string value', () => {
  assert.throws(
    () => hexToBytes(null, 32, 'Poll txid'),
    /Poll txid must be a 64-character hex string/
  )
})

test('buildTxidTextPayload prefixes the raw txid bytes', () => {
  const raw = buildTxidTextPayload('ab'.repeat(32), 'hi')
  const buf = Buffer.from(raw)

  assert.equal(buf.length, 32 + 2)
  assert.equal(buf[0], 0xab)
  assert.equal(buf.slice(32).toString('utf8'), 'hi')
})

test('txidToWireBytes reverses the display txid into little-endian wire order', () => {
  const bytes = txidToWireBytes(DISPLAY_TXID)

  assert.ok(bytes instanceof Uint8Array)
  assert.equal(Buffer.from(bytes).toString('hex'), WIRE_HEX)
})

test('txidToWireBytes rejects an invalid txid', () => {
  assert.throws(
    () => txidToWireBytes('zz'.repeat(32)),
    /valid hex string/
  )
})

test('buildTxidTextPayload embeds the txid in little-endian wire order', () => {
  const raw = buildTxidTextPayload(DISPLAY_TXID, 'hi')
  const buf = Buffer.from(raw)

  assert.equal(buf.slice(0, 32).toString('hex'), WIRE_HEX)
  assert.equal(buf.slice(32).toString('utf8'), 'hi')
})
