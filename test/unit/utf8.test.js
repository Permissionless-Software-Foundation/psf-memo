/*
  Unit tests for the UTF-8 byte-length helper (src/services/utf8.js).

  The helper must report the same UTF-8 byte length as Node's Buffer without
  depending on the Node-only `Buffer` global, so the browser build (which has
  no Buffer) can count bytes for the Memo set-name counter and length check.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { byteLength } = require('../../src/services/utf8')

test('byteLength matches Buffer.byteLength for ASCII text', () => {
  for (const s of ['', 'trout', 'a longer name with spaces', 'x'.repeat(77)]) {
    assert.equal(byteLength(s), Buffer.byteLength(s, 'utf8'))
  }
})

test('byteLength matches Buffer.byteLength for multi-byte characters', () => {
  for (const s of ['é', 'é'.repeat(38), '😀', '😀'.repeat(20), '日本語']) {
    assert.equal(byteLength(s), Buffer.byteLength(s, 'utf8'))
  }
})

test('byteLength counts UTF-8 bytes, not characters', () => {
  // 'é' is 1 character but 2 UTF-8 bytes; an emoji is 1 character but 4 bytes.
  assert.equal(byteLength('é'), 2)
  assert.equal(byteLength('😀'), 4)
  assert.equal(byteLength('a'), 1)
})

test('byteLength coerces non-string input to a string', () => {
  assert.equal(byteLength(42), 2)
  assert.equal(byteLength(null), 4) // String(null) === 'null'
})
