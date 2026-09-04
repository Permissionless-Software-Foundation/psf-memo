/*
  Property tests for the YouTube embed parser.

  The unit tests probe parsePostText / extractYouTubeVideoId at a few fixed
  fixtures. These properties pin down the parser's invariants over broad
  random inputs:

    - Round trip: concatenating the segments (text for text segments, url for
      youtube segments) reconstructs the original input exactly, including any
      trailing punctuation that was stripped from a URL.
    - Every youtube segment carries a non-empty, URL-safe video id.
    - A URL that is not a youtube.com/watch or youtu.be link never becomes a
      youtube segment; it stays plain text.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen } = require('./harness')
const {
  extractYouTubeVideoId,
  parsePostText
} = require('../../src/services/youtube-embed')

const rng = seededRandom(20260904)

const WATCH_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const SHORT_URL = 'https://youtu.be/dQw4w9WgXcQ'
const OTHER_URL = 'https://example.com/video'

// A pool of tokens used to build random post text. Mixing words, YouTube
// links, non-YouTube links, and punctuation exercises the parser's URL
// splitting and trailing-punctuation handling.
const TOKENS = [
  'hello', 'world', 'check', 'this', 'out', 'memo', 'post', 'a', 'the',
  ' ', '  ', '.', ',', '!', '?', ':', ';',
  WATCH_URL, SHORT_URL, OTHER_URL,
  'https://example.com/other/path?q=1',
  'https://youtu.be/',
  'https://www.youtube.com/watch?v='
]

function randomText () {
  const n = intGen(rng, 0, 12)()
  let text = ''
  for (let i = 0; i < n; i++) {
    text += TOKENS[Math.floor(rng() * TOKENS.length)]
  }
  return text
}

function reconstruct (segments) {
  return segments
    .map((s) => (s.type === 'youtube' ? s.url : s.text))
    .join('')
}

test('parsePostText round-trips: segments reconstruct the original text', async () => {
  await forAll(
    () => randomText(),
    async (text) => {
      const segments = parsePostText(text)
      return reconstruct(segments) === text
    },
    { label: 'youtube-embed round trip', samples: 2000 }
  )
})

test('parsePostText yields only text and youtube segments with valid video ids', async () => {
  await forAll(
    () => randomText(),
    async (text) => {
      const segments = parsePostText(text)
      for (const segment of segments) {
        if (segment.type !== 'text' && segment.type !== 'youtube') return false
        if (segment.type === 'youtube') {
          if (!segment.videoId) return false
          if (!/^[A-Za-z0-9_-]+$/.test(segment.videoId)) return false
        }
      }
      return true
    },
    { label: 'youtube-embed segment shape', samples: 2000 }
  )
})

test('parsePostText never turns a non-YouTube URL into a youtube segment', async () => {
  await forAll(
    () => randomText(),
    async (text) => {
      const segments = parsePostText(text)
      for (const segment of segments) {
        if (segment.type !== 'youtube') continue
        // A youtube segment must have come from a youtube.com/watch or
        // youtu.be URL, so its id must be extractable from that URL.
        if (extractYouTubeVideoId(segment.url) !== segment.videoId) return false
      }
      return true
    },
    { label: 'youtube-embed non-youtube stays text', samples: 2000 }
  )
})

test('extractYouTubeVideoId round-trips a valid watch and short URL', async () => {
  await forAll(
    () => {
      const id = 'id' + Math.floor(rng() * 1e9).toString(36)
      const kind = Math.floor(rng() * 2)
      return kind === 0
        ? `https://www.youtube.com/watch?v=${id}`
        : `https://youtu.be/${id}`
    },
    async (url) => {
      const id = url.split('v=')[1] || url.split('youtu.be/')[1]
      return extractYouTubeVideoId(url) === id
    },
    { label: 'youtube-embed id round trip', samples: 2000 }
  )
})
