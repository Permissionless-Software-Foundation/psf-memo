/*
  Unit tests for the post timestamp formatter.

  Memo `seen` values are epoch seconds on some API paths and epoch milliseconds
  on others; both must format to the same locale string. Falsy values format to
  an empty string so a card can omit the timestamp.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { formatSeen } = require('../../src/services/post-timestamp')

test('formatSeen returns an empty string for falsy values', () => {
  assert.equal(formatSeen(0), '')
  assert.equal(formatSeen(null), '')
  assert.equal(formatSeen(undefined), '')
})

test('formatSeen treats small values as epoch seconds', () => {
  assert.equal(formatSeen(1700000000), new Date(1700000000 * 1000).toLocaleString())
})

test('formatSeen treats large values as epoch milliseconds', () => {
  assert.equal(formatSeen(1700000000000), new Date(1700000000000).toLocaleString())
})

test('formatSeen formats the same instant identically in seconds and milliseconds', () => {
  assert.equal(formatSeen(1700000000), formatSeen(1700000000000))
})
