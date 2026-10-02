/*
  Property tests for the TikTok link parser.

  The unit tests probe extractTikTokVideoId / extractTikTokShortCode at fixed
  fixtures. These properties pin the parser's invariants over broad random
  inputs:

    - Round trip: a canonical video URL on any tiktok.com host returns exactly
      the numeric video id in the path; a short link on a short host or a /t/
      path returns exactly the opaque code.
    - Canonical and short forms are mutually exclusive.
    - A returned id is a run of digits and a returned code is a run of URL-safe
      characters, and both appear in the URL.
    - Non-TikTok hosts and non-video TikTok paths return null.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen, randomNumericId } = require('./harness')
const {
  extractTikTokVideoId,
  extractTikTokShortCode
} = require('../../src/services/tiktok-embed')

const rng = seededRandom(20261002)

const TIKTOK_HOSTS = ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com']
const SHORT_HOSTS = ['vt.tiktok.com', 'vm.tiktok.com']
const OTHER_HOSTS = ['example.com', 'tiktok.com.evil.test', 'not-tiktok.com']

const SAFE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'

function randomFrom (alphabet, min, max) {
  const length = intGen(rng, min, max)()
  let out = ''
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(rng() * alphabet.length)]
  return out
}

function randomId () {
  return randomNumericId(rng)
}

function randomCode () {
  return randomFrom(SAFE_ALPHABET, 1, 12)
}

function randomUser () {
  return randomFrom('abcdefghijklmnopqrstuvwxyz0123456789._', 1, 10)
}

function randomTail () {
  const kind = Math.floor(rng() * 3)
  if (kind === 0) return ''
  if (kind === 1) return '?is_from_webapp=1&lang=en'
  return '#top'
}

function randomCanonicalUrl () {
  const host = TIKTOK_HOSTS[Math.floor(rng() * TIKTOK_HOSTS.length)]
  const id = randomId()
  const kind = Math.floor(rng() * 4)

  if (kind === 0) return { url: `https://${host}/@${randomUser()}/video/${id}${randomTail()}`, id }
  if (kind === 1) return { url: `https://${host}/v/${id}.html${randomTail()}`, id }
  if (kind === 2) return { url: `https://${host}/player/v1/${id}${randomTail()}`, id }
  return { url: `https://${host}/embed/v2/${id}${randomTail()}`, id }
}

function randomShortUrl () {
  const code = randomCode()
  const kind = Math.floor(rng() * 3)
  if (kind === 0) return { url: `https://${SHORT_HOSTS[Math.floor(rng() * SHORT_HOSTS.length)]}/${code}`, code }
  if (kind === 1) return { url: `https://www.tiktok.com/t/${code}`, code }
  return { url: `https://www.tiktok.com/t/${code}/`, code }
}

test('canonical TikTok video URLs round-trip to their numeric id', async () => {
  await forAll(
    () => randomCanonicalUrl(),
    async ({ url, id }) => extractTikTokVideoId(url) === id,
    { label: 'tiktok canonical id round trip', samples: 2000 }
  )
})

test('short TikTok links round-trip to their opaque code', async () => {
  await forAll(
    () => randomShortUrl(),
    async ({ url, code }) => extractTikTokShortCode(url) === code,
    { label: 'tiktok short code round trip', samples: 2000 }
  )
})

test('canonical and short forms are mutually exclusive', async () => {
  await forAll(
    () => {
      if (Math.floor(rng() * 2) === 0) {
        const { url } = randomCanonicalUrl()
        return { url, kind: 'canonical' }
      }
      const { url } = randomShortUrl()
      return { url, kind: 'short' }
    },
    async ({ url, kind }) => {
      if (kind === 'canonical') return extractTikTokShortCode(url) === null
      return extractTikTokVideoId(url) === null
    },
    { label: 'tiktok form exclusivity', samples: 2000 }
  )
})

test('returned ids and codes appear in the URL with the expected shape', async () => {
  await forAll(
    () => (Math.floor(rng() * 2) === 0 ? randomCanonicalUrl().url : randomShortUrl().url),
    async (url) => {
      const id = extractTikTokVideoId(url)
      if (id !== null && (!/^\d+$/.test(id) || !url.includes(id))) return false
      const code = extractTikTokShortCode(url)
      if (code !== null && !url.includes(code)) return false
      return true
    },
    { label: 'tiktok id and code shape', samples: 2000 }
  )
})

test('non-TikTok hosts and non-video TikTok paths return null', async () => {
  await forAll(
    () => {
      const kind = Math.floor(rng() * 3)
      if (kind === 0) {
        return `https://${OTHER_HOSTS[Math.floor(rng() * OTHER_HOSTS.length)]}/@user/video/${randomId()}`
      }
      if (kind === 1) {
        return `https://www.tiktok.com/tag/${randomCode()}`
      }
      return 'https://www.tiktok.com/@user/video/notanumber'
    },
    async (url) => extractTikTokVideoId(url) === null && extractTikTokShortCode(url) === null,
    { label: 'tiktok rejects non-video links', samples: 2000 }
  )
})
