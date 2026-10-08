/*
  Property tests for the psf-memo-db HTTP client.

  Unit tests pin a few fixed endpoints and requests. These properties exercise
  broad input ranges to confirm:

    - precedence: the resolved endpoint is the first truthy of --db-url,
      MEMO_DB_URL, then the production default.
    - request fidelity: limit and offset are always carried verbatim, and the
      viewer parameter is present exactly when a viewer is supplied.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import MemoDb, {
  DEFAULT_MEMO_DB_URL,
  resolveMemoDbUrl
} from '../../src/lib/memo-db.js'

const rng = seededRandom(20261007)

// Occasionally return an empty or missing value so the precedence fall-through
// is exercised as well as the override paths.
function maybeUrl (roll) {
  if (roll < 0.2) return ''
  if (roll < 0.4) return undefined
  return `https://host-${Math.floor(rng() * 1000)}.example`
}

// Addresses with characters that require percent-encoding, so the request-path
// property checks the encoding rather than only a fixed base32 alphabet.
const ADDRESS_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789:/+?#&=%@ '

function randomAddress () {
  const length = 5 + Math.floor(rng() * 40)
  let addr = 'bitcoincash:'
  for (let i = 0; i < length; i++) {
    addr += ADDRESS_ALPHABET[Math.floor(rng() * ADDRESS_ALPHABET.length)]
  }
  return addr
}

function jsonResponse (body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

test('resolveMemoDbUrl follows --db-url > MEMO_DB_URL > default', () => {
  for (let i = 0; i < 500; i++) {
    const flagUrl = maybeUrl(rng())
    const envUrl = maybeUrl(rng())
    const expected = flagUrl || envUrl || DEFAULT_MEMO_DB_URL

    assert.equal(resolveMemoDbUrl({ flagUrl, envUrl }), expected)
  }
})

test('getProfile percent-encodes the address and returns the document', async () => {
  for (let i = 0; i < 300; i++) {
    const addr = randomAddress()
    let requested
    const client = new MemoDb({
      envUrl: null,
      fetchImpl: async (url) => {
        requested = url
        return jsonResponse({ addr })
      }
    })

    const profile = await client.getProfile(addr)

    assert.equal(requested, `${DEFAULT_MEMO_DB_URL}/level/profile/${encodeURIComponent(addr)}`)
    assert.deepEqual(profile, { addr })
  }
})

test('getProfile resolves any missing level resource to null', async () => {
  for (let i = 0; i < 200; i++) {
    const client = new MemoDb({
      envUrl: null,
      fetchImpl: async () => jsonResponse({ message: 'not found' }, 404)
    })

    assert.equal(await client.getProfile(randomAddress()), null)
  }
})

test('getJson resolves 2xx and names every failure status', async () => {
  for (let i = 0; i < 300; i++) {
    const status = 200 + Math.floor(rng() * 400)
    const client = new MemoDb({
      envUrl: null,
      fetchImpl: async () => jsonResponse({ status }, status)
    })

    if (status >= 200 && status < 300) {
      assert.deepEqual(await client.getRecentPosts(), { status })
    } else {
      let err
      try {
        await client.getRecentPosts()
      } catch (e) {
        err = e
      }
      assert.ok(err instanceof Error, `status ${status} should throw`)
      assert.match(err.message, new RegExp(String(status)))
    }
  }
})

test('getJson wraps transport failures with the requested path', async () => {
  for (let i = 0; i < 200; i++) {
    const reason = `boom-${Math.floor(rng() * 1e6)}`
    const addr = randomAddress()
    const client = new MemoDb({
      envUrl: null,
      fetchImpl: async () => {
        throw new TypeError(reason)
      }
    })

    let err
    try {
      await client.getProfile(addr)
    } catch (e) {
      err = e
    }

    assert.ok(err instanceof Error)
    assert.ok(err.message.includes(reason))
    assert.ok(err.message.includes('/level/profile/'))
  }
})

test('getRecentPosts carries the requested page and viewer', async () => {
  for (let i = 0; i < 300; i++) {
    const limit = 1 + Math.floor(rng() * 100)
    const offset = Math.floor(rng() * 1000)
    const viewer = rng() < 0.5 ? `bitcoincash:q${Math.floor(rng() * 1e9)}` : ''
    let requested

    const client = new MemoDb({
      envUrl: null,
      fetchImpl: async (url) => {
        requested = url
        return { ok: true, status: 200, json: async () => ({ posts: [] }) }
      }
    })

    await client.getRecentPosts({ limit, offset, viewer })

    const url = new URL(requested)
    assert.equal(url.pathname, '/posts/recent')
    assert.equal(url.searchParams.get('limit'), String(limit))
    assert.equal(url.searchParams.get('offset'), String(offset))
    if (viewer) {
      assert.equal(url.searchParams.get('viewer'), viewer)
    } else {
      assert.equal(url.searchParams.has('viewer'), false)
    }
  }
})

test('search carries the query, page, and viewer', async () => {
  for (let i = 0; i < 300; i++) {
    const query = `q-${Math.floor(rng() * 1e9)}`
    const limit = 1 + Math.floor(rng() * 100)
    const offset = Math.floor(rng() * 1000)
    const viewer = rng() < 0.5 ? `bitcoincash:q${Math.floor(rng() * 1e9)}` : ''
    let requested

    const client = new MemoDb({
      envUrl: null,
      fetchImpl: async (url) => {
        requested = url
        return { ok: true, status: 200, json: async () => ({ posts: [], profiles: [] }) }
      }
    })

    await client.search(query, { limit, offset, viewer })

    const url = new URL(requested)
    assert.equal(url.pathname, '/search')
    assert.equal(url.searchParams.get('q'), query)
    assert.equal(url.searchParams.get('limit'), String(limit))
    assert.equal(url.searchParams.get('offset'), String(offset))
    if (viewer) {
      assert.equal(url.searchParams.get('viewer'), viewer)
    } else {
      assert.equal(url.searchParams.has('viewer'), false)
    }
  }
})

test('getRecentProfiles carries the requested page', async () => {
  for (let i = 0; i < 300; i++) {
    const limit = 1 + Math.floor(rng() * 100)
    const offset = Math.floor(rng() * 1000)
    let requested

    const client = new MemoDb({
      envUrl: null,
      fetchImpl: async (url) => {
        requested = url
        return { ok: true, status: 200, json: async () => ({ profiles: [] }) }
      }
    })

    await client.getRecentProfiles({ limit, offset })

    const url = new URL(requested)
    assert.equal(url.pathname, '/profile/recent')
    assert.equal(url.searchParams.get('limit'), String(limit))
    assert.equal(url.searchParams.get('offset'), String(offset))
  }
})

test('getFollowing, getFollowers, and getMuted percent-encode the address', async () => {
  for (let i = 0; i < 300; i++) {
    const addr = randomAddress()
    let requested

    const client = new MemoDb({
      envUrl: null,
      fetchImpl: async (url) => {
        requested = url
        return { ok: true, status: 200, json: async () => ({}) }
      }
    })

    await client.getFollowing(addr)
    assert.equal(new URL(requested).pathname, `/follow/following/${encodeURIComponent(addr)}`)

    await client.getFollowers(addr)
    assert.equal(new URL(requested).pathname, `/follow/followers/${encodeURIComponent(addr)}`)

    await client.getMuted(addr)
    assert.equal(new URL(requested).pathname, `/mute/muted/${encodeURIComponent(addr)}`)
  }
})
