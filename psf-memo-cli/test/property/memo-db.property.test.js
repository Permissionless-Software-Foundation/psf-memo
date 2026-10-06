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

test('resolveMemoDbUrl follows --db-url > MEMO_DB_URL > default', () => {
  for (let i = 0; i < 500; i++) {
    const flagUrl = maybeUrl(rng())
    const envUrl = maybeUrl(rng())
    const expected = flagUrl || envUrl || DEFAULT_MEMO_DB_URL

    assert.equal(resolveMemoDbUrl({ flagUrl, envUrl }), expected)
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
