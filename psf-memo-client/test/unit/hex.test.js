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
const { hexToBytes, buildTxidTextPayload } = require('../../src/services/hex')

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
