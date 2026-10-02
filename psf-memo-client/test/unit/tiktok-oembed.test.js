/*
  Unit tests for the TikTok oEmbed short-link resolver.

  The resolver calls TikTok's oEmbed endpoint with the short URL and reads the
  embed_product_id from the JSON response.  The fetch is injected so the tests
  pin the request shape and the failure handling without network access.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  TIKTOK_OEMBED_ENDPOINT,
  tiktokOEmbedUrl,
  resolveTikTokVideoId
} = require('../../src/services/tiktok-oembed')

const SHORT_URL = 'https://vt.tiktok.com/ZSbUFKGVC/'
const VIDEO_ID = '7691425928601242902'

function jsonResponse (body, { ok = true } = {}) {
  return {
    ok,
    json: async () => body
  }
}

test('tiktokOEmbedUrl encodes the video URL as a query parameter', () => {
  assert.equal(
    tiktokOEmbedUrl(SHORT_URL),
    `${TIKTOK_OEMBED_ENDPOINT}?url=${encodeURIComponent(SHORT_URL)}`
  )
})

test('resolveTikTokVideoId returns embed_product_id from the oEmbed response', async () => {
  let requested
  const fetchImpl = async (url) => {
    requested = url
    return jsonResponse({ embed_product_id: VIDEO_ID })
  }

  const id = await resolveTikTokVideoId(SHORT_URL, { fetchImpl })

  assert.equal(id, VIDEO_ID)
  assert.equal(requested, tiktokOEmbedUrl(SHORT_URL))
})

test('resolveTikTokVideoId stringifies a numeric embed_product_id', async () => {
  const fetchImpl = async () => jsonResponse({ embed_product_id: 12345 })
  assert.equal(await resolveTikTokVideoId(SHORT_URL, { fetchImpl }), '12345')
})

test('resolveTikTokVideoId returns null for a non-ok response', async () => {
  const fetchImpl = async () => jsonResponse({}, { ok: false })
  assert.equal(await resolveTikTokVideoId(SHORT_URL, { fetchImpl }), null)
})

test('resolveTikTokVideoId returns null when metadata is missing', async () => {
  const fetchImpl = async () => jsonResponse({ title: 'no id here' })
  assert.equal(await resolveTikTokVideoId(SHORT_URL, { fetchImpl }), null)
})

test('resolveTikTokVideoId returns null when the request throws', async () => {
  const fetchImpl = async () => { throw new Error('network down') }
  assert.equal(await resolveTikTokVideoId(SHORT_URL, { fetchImpl }), null)
})

test('resolveTikTokVideoId returns null when no fetch is available', async () => {
  assert.equal(await resolveTikTokVideoId(SHORT_URL, { fetchImpl: null }), null)
})
