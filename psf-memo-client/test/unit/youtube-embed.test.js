/*
  Unit tests for the YouTube embed parser.

  The parser turns a post's raw text into text segments and YouTube embed
  segments.  It must recognize watch and short YouTube URLs, ignore other
  URLs and malformed YouTube URLs, and preserve the surrounding text.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  extractYouTubeVideoId,
  parsePostText
} = require('../../src/services/youtube-embed')

const WATCH_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const SHORT_URL = 'https://youtu.be/dQw4w9WgXcQ'
const VIDEO_ID = 'dQw4w9WgXcQ'

test('extractYouTubeVideoId returns the video id for a watch URL', () => {
  assert.equal(extractYouTubeVideoId(WATCH_URL), VIDEO_ID)
})

test('extractYouTubeVideoId returns the video id for a short URL', () => {
  assert.equal(extractYouTubeVideoId(SHORT_URL), VIDEO_ID)
})

test('extractYouTubeVideoId returns null for a non-YouTube URL', () => {
  assert.equal(extractYouTubeVideoId('https://example.com/video'), null)
})

test('extractYouTubeVideoId returns null when the watch URL has no v value', () => {
  assert.equal(extractYouTubeVideoId('https://www.youtube.com/watch?v='), null)
})

test('extractYouTubeVideoId returns null when the short URL has no path id', () => {
  assert.equal(extractYouTubeVideoId('https://youtu.be/'), null)
})

test('parsePostText returns a single youtube segment for a bare watch URL', () => {
  const segments = parsePostText(WATCH_URL)
  assert.equal(segments.length, 1)
  assert.deepEqual(segments[0], { type: 'youtube', videoId: VIDEO_ID, url: WATCH_URL })
})

test('parsePostText returns a single youtube segment for a bare short URL', () => {
  const segments = parsePostText(SHORT_URL)
  assert.equal(segments.length, 1)
  assert.deepEqual(segments[0], { type: 'youtube', videoId: VIDEO_ID, url: SHORT_URL })
})

test('parsePostText preserves surrounding text and replaces the URL with an embed segment', () => {
  const segments = parsePostText(`check this out ${WATCH_URL}`)
  assert.equal(segments.length, 2)
  assert.deepEqual(segments[0], { type: 'text', text: 'check this out ' })
  assert.deepEqual(segments[1], { type: 'youtube', videoId: VIDEO_ID, url: WATCH_URL })
})

test('parsePostText returns plain text when no embeddable YouTube link is present', () => {
  const text = 'just a normal memo'
  const segments = parsePostText(text)
  assert.equal(segments.length, 1)
  assert.deepEqual(segments[0], { type: 'text', text })
})

test('parsePostText keeps a non-YouTube URL as plain text', () => {
  const text = 'visit https://example.com for details'
  const segments = parsePostText(text)
  assert.equal(segments.length, 3)
  assert.deepEqual(segments[0], { type: 'text', text: 'visit ' })
  assert.deepEqual(segments[1], { type: 'text', text: 'https://example.com' })
  assert.deepEqual(segments[2], { type: 'text', text: ' for details' })
})

test('parsePostText keeps an invalid YouTube URL as plain text', () => {
  const text = 'broken https://www.youtube.com/watch?v= link'
  const segments = parsePostText(text)
  assert.equal(segments.length, 3)
  assert.deepEqual(segments[0], { type: 'text', text: 'broken ' })
  assert.deepEqual(segments[1], { type: 'text', text: 'https://www.youtube.com/watch?v=' })
  assert.deepEqual(segments[2], { type: 'text', text: ' link' })
})

test('parsePostText preserves text that follows an embedded URL', () => {
  const segments = parsePostText(`${SHORT_URL} enjoy`)
  assert.equal(segments.length, 2)
  assert.deepEqual(segments[0], { type: 'youtube', videoId: VIDEO_ID, url: SHORT_URL })
  assert.deepEqual(segments[1], { type: 'text', text: ' enjoy' })
})

test('parsePostText handles multiple YouTube links in one post', () => {
  const segments = parsePostText(`${WATCH_URL} and ${SHORT_URL}`)
  assert.equal(segments.length, 3)
  assert.deepEqual(segments[0], { type: 'youtube', videoId: VIDEO_ID, url: WATCH_URL })
  assert.deepEqual(segments[1], { type: 'text', text: ' and ' })
  assert.deepEqual(segments[2], { type: 'youtube', videoId: VIDEO_ID, url: SHORT_URL })
})

test('parsePostText drops trailing punctuation from the URL when extracting the id', () => {
  const segments = parsePostText(`watch ${WATCH_URL}.`)
  assert.equal(segments.length, 3)
  assert.deepEqual(segments[0], { type: 'text', text: 'watch ' })
  assert.deepEqual(segments[1], { type: 'youtube', videoId: VIDEO_ID, url: WATCH_URL })
  assert.deepEqual(segments[2], { type: 'text', text: '.' })
})

test('parsePostText treats an empty string as a single empty text segment', () => {
  const segments = parsePostText('')
  assert.equal(segments.length, 1)
  assert.deepEqual(segments[0], { type: 'text', text: '' })
})
