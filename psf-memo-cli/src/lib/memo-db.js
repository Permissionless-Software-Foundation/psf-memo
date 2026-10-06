/*
  Read-only HTTP client for the psf-memo-db REST API.

  The endpoint is selected, in order, by an explicit --db-url override, the
  MEMO_DB_URL environment variable, then the production memo-db default. The
  client uses the Node 20 global fetch, so callers can inject a fetch
  implementation for tests. A 404 on a /level/* resource resolves to null (no
  data), while a transport or server failure is reported as an error.
*/

// Production memo-db. Local development points MEMO_DB_URL at
// http://localhost:5021 instead.
export const DEFAULT_MEMO_DB_URL = 'https://memo-api.fullstackcash.net'

// Resolve the endpoint with --db-url > MEMO_DB_URL > production default.
export function resolveMemoDbUrl ({ flagUrl, envUrl } = {}) {
  return flagUrl || envUrl || DEFAULT_MEMO_DB_URL
}

class MemoDb {
  constructor ({ dbUrl, envUrl = process.env.MEMO_DB_URL, fetchImpl = globalThis.fetch } = {}) {
    // Encapsulate dependencies so tests can inject a fake fetch.
    this.fetch = fetchImpl
    this.dbUrl = resolveMemoDbUrl({ flagUrl: dbUrl, envUrl })
  }

  // The endpoint this client calls.
  get endpoint () {
    return this.dbUrl
  }

  // GET /posts/recent, optionally filtered for a viewer's mutes.
  async getRecentPosts ({ limit = 50, offset = 0, viewer = null } = {}) {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    params.set('offset', String(offset))
    if (viewer) params.set('viewer', viewer)

    return this.getJson(`/posts/recent?${params.toString()}`)
  }

  // GET /level/profile/:addr. A missing profile resolves to null.
  async getProfile (addr) {
    return this.getJson(`/level/profile/${encodeURIComponent(addr)}`, { notFoundValue: null })
  }

  // GET a JSON resource. Throws on a transport failure or a non-OK response.
  // When notFoundValue is supplied (including null), a 404 returns it instead.
  async getJson (path, { notFoundValue } = {}) {
    let response

    try {
      response = await this.fetch(`${this.dbUrl}${path}`)
    } catch (err) {
      throw new Error(`Memo DB request to ${path} failed: ${err.message}`)
    }

    if (response.status === 404 && notFoundValue !== undefined) {
      return notFoundValue
    }

    if (!response.ok) {
      throw new Error(`Memo DB request to ${path} failed with HTTP ${response.status}`)
    }

    return response.json()
  }
}

export default MemoDb
