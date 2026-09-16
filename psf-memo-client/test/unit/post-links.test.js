/*
  Unit tests for the post link parser.

  The parser turns a post's text into text and link segments.  A link segment
  is either an http(s) URL (scheme preserved) or a bare domain (linked with an
  https scheme while its visible text is left as written).  Trailing sentence
  punctuation never becomes part of the link.  Plain text and email addresses
  stay plain text.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { parsePostLinks } = require('../../src/services/post-links')

test('parsePostLinks returns a single text segment for plain text', () => {
  const text = 'just a normal memo'
  assert.deepEqual(parsePostLinks(text), [{ type: 'text', text }])
})

test('parsePostLinks returns an empty text segment for an empty string', () => {
  assert.deepEqual(parsePostLinks(''), [{ type: 'text', text: '' }])
})

test('parsePostLinks links an https URL and preserves its scheme', () => {
  assert.deepEqual(parsePostLinks('visit https://memo.fullstackcash.net for details'), [
    { type: 'text', text: 'visit ' },
    { type: 'link', href: 'https://memo.fullstackcash.net', text: 'https://memo.fullstackcash.net' },
    { type: 'text', text: ' for details' }
  ])
})

test('parsePostLinks links an http URL and preserves its scheme', () => {
  assert.deepEqual(parsePostLinks('link http://example.com/path here'), [
    { type: 'text', text: 'link ' },
    { type: 'link', href: 'http://example.com/path', text: 'http://example.com/path' },
    { type: 'text', text: ' here' }
  ])
})

test('parsePostLinks keeps trailing punctuation out of the link', () => {
  assert.deepEqual(parsePostLinks('read https://memo.fullstackcash.net, then reply'), [
    { type: 'text', text: 'read ' },
    { type: 'link', href: 'https://memo.fullstackcash.net', text: 'https://memo.fullstackcash.net' },
    { type: 'text', text: ', then reply' }
  ])
})

test('parsePostLinks links a bare domain with an https href and unchanged visible text', () => {
  assert.deepEqual(parsePostLinks('visit memo.fullstackcash.net for details'), [
    { type: 'text', text: 'visit ' },
    { type: 'link', href: 'https://memo.fullstackcash.net', text: 'memo.fullstackcash.net' },
    { type: 'text', text: ' for details' }
  ])
})

test('parsePostLinks links a bare domain with a path', () => {
  assert.deepEqual(parsePostLinks('see memo.fullstackcash.net/feed now'), [
    { type: 'text', text: 'see ' },
    { type: 'link', href: 'https://memo.fullstackcash.net/feed', text: 'memo.fullstackcash.net/feed' },
    { type: 'text', text: ' now' }
  ])
})

test('parsePostLinks links a bare www domain', () => {
  assert.deepEqual(parsePostLinks('go to www.example.com now'), [
    { type: 'text', text: 'go to ' },
    { type: 'link', href: 'https://www.example.com', text: 'www.example.com' },
    { type: 'text', text: ' now' }
  ])
})

test('parsePostLinks keeps trailing punctuation out of a bare-domain link', () => {
  assert.deepEqual(parsePostLinks('visit memo.fullstackcash.net, it is live'), [
    { type: 'text', text: 'visit ' },
    { type: 'link', href: 'https://memo.fullstackcash.net', text: 'memo.fullstackcash.net' },
    { type: 'text', text: ', it is live' }
  ])
})

test('parsePostLinks handles multiple links in one post', () => {
  assert.deepEqual(
    parsePostLinks('watch https://youtu.be/dQw4w9WgXcQ then read https://memo.fullstackcash.net'),
    [
      { type: 'text', text: 'watch ' },
      { type: 'link', href: 'https://youtu.be/dQw4w9WgXcQ', text: 'https://youtu.be/dQw4w9WgXcQ' },
      { type: 'text', text: ' then read ' },
      { type: 'link', href: 'https://memo.fullstackcash.net', text: 'https://memo.fullstackcash.net' }
    ]
  )
})

test('parsePostLinks does not link an email address', () => {
  const text = 'write to me at chris@example.com please'
  assert.deepEqual(parsePostLinks(text), [{ type: 'text', text }])
})

test('parsePostLinks does not link a dotted user name before an @ sign', () => {
  const text = 'write to first.last@example.com please'
  assert.deepEqual(parsePostLinks(text), [{ type: 'text', text }])
})

test('parsePostLinks round-trips: segments reconstruct the original text', () => {
  const samples = [
    'just a normal memo',
    'visit memo.fullstackcash.net for details',
    'read https://memo.fullstackcash.net, then reply',
    'go to www.example.com now',
    'watch https://youtu.be/dQw4w9WgXcQ then read https://memo.fullstackcash.net',
    'write to chris@example.com please',
    ''
  ]
  for (const text of samples) {
    const rebuilt = parsePostLinks(text)
      .map((segment) => segment.text)
      .join('')
    assert.equal(rebuilt, text)
  }
})
