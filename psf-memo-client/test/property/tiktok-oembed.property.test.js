/*
  Property tests for the TikTok oEmbed short-link resolver.

  The unit tests probe fixed requests and failures. These properties pin the
  resolver's invariants over broad random inputs:

    - tiktokOEmbedUrl round-trips the video URL through the `url` query
      parameter, whatever characters the URL contains.
    - A successful response yields exactly String(embed_product_id).
    - A missing fetch, a non-ok response, missing metadata, or a thrown error
      all yield null so the renderer can fall back to a plain link.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, randomFrom, randomNumericId } = require('./harness')
const {
  TIKTOK_OEMBED_ENDPOINT,
  tiktokOEmbedUrl,
  resolveTikTokVideoId
} = require('../../src/services/tiktok-oembed')

const rng = seededRandom(20261002)

const SAFE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
const SHORT_HOSTS = ['vt.tiktok.com', 'vm.tiktok.com']

function randomShortUrl () {
  const host = SHORT_HOSTS[Math.floor(rng() * SHORT_HOSTS.length)]
  return `https://${host}/${randomFrom(rng, SAFE_ALPHABET, 1, 12)}/`
}

test('tiktokOEmbedUrl round-trips the video URL through the url query parameter', async () => {
  await forAll(
    () => randomShortUrl(),
    async (url) => {
      const parsed = new URL(tiktokOEmbedUrl(url))
      return `${parsed.origin}${parsed.pathname}` === TIKTOK_OEMBED_ENDPOINT &&
        parsed.searchParams.get('url') === url
    },
    { label: 'tiktok oembed url round trip', samples: 1000 }
  )
})

test('resolveTikTokVideoId returns the stringified embed_product_id on success', async () => {
  await forAll(
    () => randomNumericId(rng),
    async (id) => {
      const fetchImpl = async () => ({ ok: true, json: async () => ({ embed_product_id: id }) })
      return await resolveTikTokVideoId(randomShortUrl(), { fetchImpl }) === id
    },
    { label: 'tiktok oembed success', samples: 1000 }
  )
})

test('resolveTikTokVideoId returns null for every failure mode', async () => {
  await forAll(
    () => randomShortUrl(),
    async (url) => {
      const cases = [
        { fetchImpl: null },
        { fetchImpl: async () => ({ ok: false, json: async () => ({ embed_product_id: '1' }) }) },
        { fetchImpl: async () => ({ ok: true, json: async () => ({}) }) },
        { fetchImpl: async () => { throw new Error('network down') } }
      ]
      const results = await Promise.all(cases.map((opts) => resolveTikTokVideoId(url, opts)))
      return results.every((result) => result === null)
    },
    { label: 'tiktok oembed failure modes', samples: 500 }
  )
})
