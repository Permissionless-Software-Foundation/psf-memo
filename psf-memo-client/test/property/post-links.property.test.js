/*
  Property tests for the post link parser.

  The unit tests probe parsePostLinks at a few fixed fixtures. These
  properties pin down the parser's invariants over broad random inputs:

    - Round trip: concatenating the visible text of every segment reconstructs
      the original input exactly, including trailing punctuation that was
      stripped from a link.
    - Segment shape: every segment is text or link; link segments carry a
      non-empty, whitespace-free href. An explicit http(s) URL keeps its
      scheme; a bare domain is linked with an https scheme while its visible
      text stays as written.
    - Trailing sentence punctuation never becomes part of a link.
    - Links appear in the same order as in the input.
    - An email address is never linked.
    - Parsing is deterministic.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { seededRandom, forAll, intGen } = require('./harness')
const { parsePostLinks } = require('../../src/services/post-links')

const rng = seededRandom(20260916)

const HTTP_URLS = [
  'https://memo.fullstackcash.net',
  'http://example.com/path',
  'https://example.com/other/path?q=1',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://example.com/a/b/c',
  'http://sub.domain.example.co'
]

const BARE_DOMAINS = [
  'memo.fullstackcash.net',
  'memo.fullstackcash.net/feed',
  'www.example.com',
  'example.com',
  'sub.domain.example.co/path'
]

const EMAILS = ['chris@example.com', 'first.last@example.com', 'a@b.co']

const WORDS = [
  'hello', 'world', 'check', 'this', 'out', 'memo', 'post', 'a', 'the',
  'visit', 'go', 'to', 'now', 'read', 'see'
]

const PUNCTUATION = [' ', '  ', '.', ',', '!', '?', ':', ';', ')', ']']

const TRAILING_PUNCTUATION_RE = /[.,;:!?)\]]$/

const TOKENS = [...WORDS, ...PUNCTUATION, ...HTTP_URLS, ...BARE_DOMAINS, ...EMAILS]

function randomText () {
  const n = intGen(rng, 0, 14)()
  let text = ''
  for (let i = 0; i < n; i++) {
    text += TOKENS[Math.floor(rng() * TOKENS.length)]
  }
  return text
}

function reconstruct (segments) {
  return segments.map((segment) => segment.text).join('')
}

function isHttpUrl (value) {
  return /^https?:\/\//.test(value)
}

test('parsePostLinks round-trips: segments reconstruct the original text', async () => {
  await forAll(
    () => randomText(),
    async (text) => reconstruct(parsePostLinks(text)) === text,
    { label: 'post-links round trip', samples: 3000 }
  )
})

test('parsePostLinks yields only valid text and link segments', async () => {
  await forAll(
    () => randomText(),
    async (text) => {
      for (const segment of parsePostLinks(text)) {
        if (segment.type === 'text') {
          if (typeof segment.text !== 'string') return false
          continue
        }
        if (segment.type !== 'link') return false
        if (!segment.href || typeof segment.href !== 'string') return false
        if (!segment.text || typeof segment.text !== 'string') return false
        if (/\s/.test(segment.text)) return false
        if (!isHttpUrl(segment.href)) return false
        // Explicit URLs preserve their scheme; bare domains get https.
        const expectedHref = isHttpUrl(segment.text) ? segment.text : `https://${segment.text}`
        if (segment.href !== expectedHref) return false
      }
      return true
    },
    { label: 'post-links segment shape', samples: 3000 }
  )
})

test('parsePostLinks never leaves trailing punctuation in a link', async () => {
  await forAll(
    () => randomText(),
    async (text) => {
      for (const segment of parsePostLinks(text)) {
        if (segment.type === 'link' && TRAILING_PUNCTUATION_RE.test(segment.text)) {
          return false
        }
      }
      return true
    },
    { label: 'post-links trailing punctuation', samples: 3000 }
  )
})

test('parsePostLinks yields links in input order', async () => {
  await forAll(
    () => randomText(),
    async (text) => {
      let cursor = 0
      for (const segment of parsePostLinks(text)) {
        if (segment.type !== 'link') continue
        const at = text.indexOf(segment.text, cursor)
        if (at < 0) return false
        cursor = at + segment.text.length
      }
      return true
    },
    { label: 'post-links ordering', samples: 3000 }
  )
})

test('parsePostLinks never links an email address', async () => {
  await forAll(
    () => {
      const local = ['chris', 'first.last', 'a_b', 'x'][Math.floor(rng() * 4)]
      const domain = ['example.com', 'b.co', 'mail.example.org'][Math.floor(rng() * 3)]
      return `${local}@${domain}`
    },
    async (email) => {
      const segments = parsePostLinks(email)
      return segments.length === 1 &&
        segments[0].type === 'text' &&
        segments[0].text === email
    },
    { label: 'post-links email stays text', samples: 500 }
  )
})

test('parsePostLinks is deterministic', async () => {
  await forAll(
    () => randomText(),
    async (text) => {
      const first = parsePostLinks(text)
      const second = parsePostLinks(text)
      return JSON.stringify(first) === JSON.stringify(second)
    },
    { label: 'post-links determinism', samples: 2000 }
  )
})

test('parsePostLinks stringifies nullish and non-string input', () => {
  assert.deepEqual(parsePostLinks(null), [{ type: 'text', text: '' }])
  assert.deepEqual(parsePostLinks(undefined), [{ type: 'text', text: '' }])
  assert.deepEqual(parsePostLinks(12345), [{ type: 'text', text: '12345' }])
})
