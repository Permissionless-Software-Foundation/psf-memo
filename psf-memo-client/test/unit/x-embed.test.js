/*
  Unit tests for the X (Twitter) status-link parser.

  The parser recognizes x.com and twitter.com status links and returns their
  numeric status id.  Non-status links, malformed status links, and other
  hosts must return null so they stay ordinary links in the post renderer.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  X_EMBED_BASE_URL,
  extractXStatusId
} = require('../../src/services/x-embed')

const STATUS_ID = '2105979472067297387'

test('extractXStatusId returns the id for an x.com status link', () => {
  assert.equal(extractXStatusId(`https://x.com/donatello/status/${STATUS_ID}`), STATUS_ID)
})

test('extractXStatusId returns the id for a twitter.com status link', () => {
  assert.equal(extractXStatusId(`https://twitter.com/bob/status/${STATUS_ID}`), STATUS_ID)
})

test('extractXStatusId returns the id for www and mobile subdomains', () => {
  assert.equal(extractXStatusId(`https://www.x.com/alice/status/${STATUS_ID}`), STATUS_ID)
  assert.equal(extractXStatusId(`https://mobile.twitter.com/carol/status/${STATUS_ID}`), STATUS_ID)
})

test('extractXStatusId returns the id for an /i/web/status link', () => {
  assert.equal(extractXStatusId(`https://x.com/i/web/status/${STATUS_ID}`), STATUS_ID)
})

test('extractXStatusId ignores a query string', () => {
  assert.equal(extractXStatusId(`https://x.com/dave/status/${STATUS_ID}?s=20`), STATUS_ID)
})

test('extractXStatusId returns null for an x.com link that is not a status', () => {
  assert.equal(extractXStatusId('https://x.com/donatello'), null)
})

test('extractXStatusId returns null when the status id is missing', () => {
  assert.equal(extractXStatusId('https://x.com/donatello/status/'), null)
})

test('extractXStatusId returns null when the status id is not numeric', () => {
  assert.equal(extractXStatusId('https://x.com/donatello/status/notanumber'), null)
})

test('extractXStatusId returns null for a status link on another host', () => {
  assert.equal(extractXStatusId(`https://example.com/x/status/${STATUS_ID}`), null)
})

test('extractXStatusId returns null for a bare twitter.com host', () => {
  assert.equal(extractXStatusId('https://twitter.com/'), null)
})

test('extractXStatusId returns null for non-string and unparseable input', () => {
  assert.equal(extractXStatusId(null), null)
  assert.equal(extractXStatusId(42), null)
  assert.equal(extractXStatusId('not a url'), null)
})

test('the X embed URL points at the self-contained tweet frame', () => {
  assert.equal(X_EMBED_BASE_URL, 'https://platform.twitter.com/embed/Tweet.html')
})
