/*
  Property tests for the X (Twitter) status-link parser.

  The unit tests probe extractXStatusId at a few fixed fixtures. These
  properties pin the parser's invariants over broad random inputs:

    - Round trip: for a status URL on an x.com/twitter.com host (including the
      www. and mobile. variants), extractXStatusId returns exactly the numeric
      status id in the path.
    - A returned id is always a non-empty run of digits that appears in the URL.
    - URLs that are not X status links - other hosts, non-status paths, a
      missing or non-numeric id, and non-http(s) schemes - return null.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen } = require('./harness')
const { extractXStatusId } = require('../../src/services/x-embed')

const rng = seededRandom(20261002)

const X_HOSTS = [
  'x.com',
  'twitter.com',
  'www.x.com',
  'www.twitter.com',
  'mobile.x.com',
  'mobile.twitter.com'
]

const OTHER_HOSTS = ['example.com', 'x.com.evil.test', 'notx.com', 'twitter.org']

// A numeric status id: no leading zero, 1..19 digits.
function randomStatusId () {
  const length = intGen(rng, 1, 19)()
  let id = String(intGen(rng, 1, 9)())
  for (let i = 1; i < length; i++) id += String(intGen(rng, 0, 9)())
  return id
}

function randomUser () {
  return ['donatello', 'bob', 'alice', 'i/web', 'a'][Math.floor(rng() * 5)]
}

function randomStatusUrl (host, id) {
  return `https://${host}/${randomUser()}/status/${id}`
}

test('extractXStatusId round-trips a status id on every X host variant', async () => {
  await forAll(
    () => ({ host: X_HOSTS[Math.floor(rng() * X_HOSTS.length)], id: randomStatusId() }),
    async ({ host, id }) => extractXStatusId(randomStatusUrl(host, id)) === id,
    { label: 'x-embed status id round trip', samples: 2000 }
  )
})

test('extractXStatusId accepts trailing slash, path suffix, and query string', async () => {
  await forAll(
    () => ({ host: X_HOSTS[Math.floor(rng() * X_HOSTS.length)], id: randomStatusId() }),
    async ({ host, id }) => {
      const base = `https://${host}/${randomUser()}/status/${id}`
      const variants = [base, `${base}/`, `${base}/photo/1`, `${base}?s=20&ref=abc`, `${base}#top`]
      return variants.every((url) => extractXStatusId(url) === id)
    },
    { label: 'x-embed variants', samples: 1000 }
  )
})

test('a returned status id is a non-empty digit run that appears in the URL', async () => {
  await forAll(
    () => {
      const host = Math.floor(rng() * 2) === 0
        ? X_HOSTS[Math.floor(rng() * X_HOSTS.length)]
        : OTHER_HOSTS[Math.floor(rng() * OTHER_HOSTS.length)]
      return randomStatusUrl(host, randomStatusId())
    },
    async (url) => {
      const id = extractXStatusId(url)
      if (id === null) return true
      return /^\d+$/.test(id) && url.includes(id)
    },
    { label: 'x-embed id shape', samples: 2000 }
  )
})

test('non-X hosts and non-status X paths return null', async () => {
  await forAll(
    () => {
      const kind = Math.floor(rng() * 3)
      if (kind === 0) {
        return `https://${OTHER_HOSTS[Math.floor(rng() * OTHER_HOSTS.length)]}/user/status/${randomStatusId()}`
      }
      if (kind === 1) {
        return `https://${X_HOSTS[Math.floor(rng() * X_HOSTS.length)]}/${randomUser()}`
      }
      return `https://${X_HOSTS[Math.floor(rng() * X_HOSTS.length)]}/${randomUser()}/status/not${randomStatusId()}`
    },
    async (url) => extractXStatusId(url) === null,
    { label: 'x-embed rejects non-status links', samples: 2000 }
  )
})

test('missing id and non-http(s) schemes return null', async () => {
  await forAll(
    () => X_HOSTS[Math.floor(rng() * X_HOSTS.length)],
    async (host) => {
      const id = randomStatusId()
      const missing = `https://${host}/${randomUser()}/status/`
      const ftp = `ftp://${host}/${randomUser()}/status/${id}`
      return extractXStatusId(missing) === null && extractXStatusId(ftp) === null
    },
    { label: 'x-embed rejects missing id and bad scheme', samples: 500 }
  )
})
