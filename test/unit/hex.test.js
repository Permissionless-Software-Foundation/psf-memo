/*
  Unit tests for the hex conversion helper (src/services/hex.js).

  Memo actions like replies and likes embed a post txid in the OP_RETURN
  payload as raw bytes, so the helper must decode a canonical 64-character hex
  string into exactly 32 bytes and reject anything else with a clear error.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { hexToBytes } = require('../../src/services/hex')

test('hexToBytes decodes a 64-char hex string into 32 bytes', () => {
  const hex = 'a'.repeat(64)
  const bytes = hexToBytes(hex, 32)
  assert.ok(bytes instanceof Uint8Array)
  assert.equal(bytes.length, 32)
  assert.equal(Buffer.from(bytes).toString('hex'), hex)
})

test('hexToBytes rejects a string of the wrong length', () => {
  assert.throws(
    () => hexToBytes('a'.repeat(10), 32),
    /64-character hex string/
  )
})

test('hexToBytes rejects a 64-char string containing a non-hex character', () => {
  assert.throws(
    () => hexToBytes(`z${'a'.repeat(63)}`, 32),
    /valid hex string/
  )
})

test('hexToBytes rejects non-string input', () => {
  assert.throws(
    () => hexToBytes(null, 32),
    /64-character hex string/
  )
})

test('hexToBytes uses a custom label in error messages', () => {
  assert.throws(
    () => hexToBytes('nope', 32, 'Post txid'),
    /Post txid/
  )
})
