/*
  Unit tests for the TikTok link parser.

  The parser recognizes canonical TikTok video links and returns their numeric
  video id, and recognizes short links and returns their opaque code.  Other
  TikTok links (profiles, tags, home) and other hosts must return null so they
  stay ordinary links in the post renderer.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  TIKTOK_EMBED_BASE_URL,
  extractTikTokVideoId,
  extractTikTokShortCode
} = require('../../src/services/tiktok-embed')

const VIDEO_ID = '6718335390845095173'

test('extractTikTokVideoId returns the id for an @user/video link', () => {
  assert.equal(extractTikTokVideoId(`https://www.tiktok.com/@scout2015/video/${VIDEO_ID}`), VIDEO_ID)
  assert.equal(extractTikTokVideoId(`https://tiktok.com/@alice/video/${VIDEO_ID}`), VIDEO_ID)
})

test('extractTikTokVideoId returns the id for an m.tiktok.com/v link', () => {
  assert.equal(extractTikTokVideoId(`https://m.tiktok.com/v/${VIDEO_ID}.html`), VIDEO_ID)
})

test('extractTikTokVideoId returns the id for player and embed links', () => {
  assert.equal(extractTikTokVideoId(`https://www.tiktok.com/player/v1/${VIDEO_ID}`), VIDEO_ID)
  assert.equal(extractTikTokVideoId(`https://www.tiktok.com/embed/v2/${VIDEO_ID}`), VIDEO_ID)
})

test('extractTikTokVideoId ignores a query string', () => {
  assert.equal(
    extractTikTokVideoId(`https://www.tiktok.com/@dave/video/${VIDEO_ID}?is_from_webapp=1`),
    VIDEO_ID
  )
})

test('extractTikTokVideoId returns null for non-video TikTok links', () => {
  assert.equal(extractTikTokVideoId('https://www.tiktok.com/@scout2015'), null)
  assert.equal(extractTikTokVideoId('https://www.tiktok.com/tag/chess'), null)
  assert.equal(extractTikTokVideoId('https://www.tiktok.com/'), null)
})

test('extractTikTokVideoId returns null for a non-numeric video id', () => {
  assert.equal(extractTikTokVideoId('https://www.tiktok.com/@user/video/notanumber'), null)
})

test('extractTikTokVideoId returns null for another host', () => {
  assert.equal(extractTikTokVideoId(`https://example.com/video/${VIDEO_ID}`), null)
})

test('extractTikTokVideoId returns null for non-string and unparseable input', () => {
  assert.equal(extractTikTokVideoId(null), null)
  assert.equal(extractTikTokVideoId('not a url'), null)
})

test('extractTikTokShortCode returns the code for vt and vm links', () => {
  assert.equal(extractTikTokShortCode('https://vt.tiktok.com/ZSbUFKGVC/'), 'ZSbUFKGVC')
  assert.equal(extractTikTokShortCode('https://vm.tiktok.com/ZM1234567/'), 'ZM1234567')
})

test('extractTikTokShortCode returns the code for a /t/ link', () => {
  assert.equal(extractTikTokShortCode('https://www.tiktok.com/t/ZT7654321/'), 'ZT7654321')
})

test('extractTikTokShortCode returns null for a short host with no code', () => {
  assert.equal(extractTikTokShortCode('https://vt.tiktok.com/'), null)
})

test('extractTikTokShortCode returns null for canonical, non-video, and other hosts', () => {
  assert.equal(extractTikTokShortCode(`https://www.tiktok.com/@scout2015/video/${VIDEO_ID}`), null)
  assert.equal(extractTikTokShortCode('https://www.tiktok.com/@scout2015'), null)
  assert.equal(extractTikTokShortCode(`https://example.com/video/${VIDEO_ID}`), null)
  assert.equal(extractTikTokShortCode(null), null)
})

test('the TikTok embed URL points at the self-contained player frame', () => {
  assert.equal(TIKTOK_EMBED_BASE_URL, 'https://www.tiktok.com/player/v1')
})
