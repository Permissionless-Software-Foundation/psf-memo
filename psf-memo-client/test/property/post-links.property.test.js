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
const {
  parsePostLinks,
  isImageUrl,
  imageAltText
} = require('../../src/services/post-links')

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

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']
const NON_IMAGE_EXTENSIONS = ['svg', 'pdf', 'txt', 'html', 'json', 'js']

function randomCase (value) {
  let out = ''
  for (const ch of value) {
    out += rng() < 0.5 ? ch.toLowerCase() : ch.toUpperCase()
  }
  return out
}

function randomName () {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const n = intGen(rng, 1, 10)()
  let out = ''
  for (let i = 0; i < n; i++) out += alphabet[Math.floor(rng() * alphabet.length)]
  return out
}

function randomHost () {
  return ['example.com', 'cdn.example.org', 'i.imgur.com', 'images.example.net'][Math.floor(rng() * 4)]
}

function randomQueryOrFragment () {
  const kind = Math.floor(rng() * 4)
  if (kind === 0) return ''
  if (kind === 1) return `?w=${intGen(rng, 1, 2000)()}`
  if (kind === 2) return '#section'
  return '?a=1&b=2#frag'
}

function randomImageUrl () {
  const ext = randomCase(IMAGE_EXTENSIONS[Math.floor(rng() * IMAGE_EXTENSIONS.length)])
  const dir = ['', 'pics/', 'a/b/', 'img/'][Math.floor(rng() * 4)]
  return `https://${randomHost()}/${dir}${randomName()}.${ext}${randomQueryOrFragment()}`
}

function randomNonImageUrl () {
  if (Math.floor(rng() * 3) === 0) {
    return `https://${randomHost()}/page${randomQueryOrFragment()}`
  }
  const ext = NON_IMAGE_EXTENSIONS[Math.floor(rng() * NON_IMAGE_EXTENSIONS.length)]
  return `https://${randomHost()}/${randomName()}.${ext}${randomQueryOrFragment()}`
}

test('isImageUrl recognizes supported image extensions regardless of case or query', async () => {
  await forAll(
    () => randomImageUrl(),
    async (url) => isImageUrl(url) === true,
    { label: 'isImageUrl image urls', samples: 2000 }
  )
})

test('isImageUrl rejects non-image paths even when a query mentions an image', async () => {
  await forAll(
    () => randomNonImageUrl(),
    async (url) => isImageUrl(url) === false,
    { label: 'isImageUrl non-image urls', samples: 2000 }
  )
})

test('isImageUrl and imageAltText never throw and are deterministic for arbitrary input', async () => {
  await forAll(
    () => randomText(),
    async (text) => {
      let image, alt, imageAgain, altAgain
      try {
        image = isImageUrl(text)
        alt = imageAltText(text)
        imageAgain = isImageUrl(text)
        altAgain = imageAltText(text)
      } catch {
        return false
      }
      if (typeof image !== 'boolean') return false
      if (typeof alt !== 'string' || alt.length === 0) return false
      return image === imageAgain && alt === altAgain
    },
    { label: 'isImageUrl/imageAltText robustness', samples: 3000 }
  )
})

test('imageAltText returns the URL filename, ignoring query string and fragment', async () => {
  await forAll(
    () => randomImageUrl(),
    async (url) => imageAltText(url) === new URL(url).pathname.split('/').pop(),
    { label: 'imageAltText filename', samples: 2000 }
  )
})

test('parsePostLinks keeps an image URL intact so isImageUrl still recognizes it', async () => {
  await forAll(
    () => randomImageUrl(),
    async (url) => {
      const link = parsePostLinks(`see ${url} now`).find((segment) => segment.type === 'link')
      return Boolean(link) && link.href === url && isImageUrl(link.href) === true
    },
    { label: 'parsePostLinks image url round trip', samples: 2000 }
  )
})
