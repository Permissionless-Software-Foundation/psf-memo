/*
  Read-only HTTP client for the psf-memo-db REST API.

  The endpoint is selected, in order, by an explicit --db-url override, the
  MEMO_DB_URL environment variable, then the production memo-db default. The
  client uses the Node 20 global fetch, so callers can inject a fetch
  implementation for tests. A 404 on a /level/* resource or an unindexed
  post's thread resolves to null (no data), while a transport or server failure
  is reported as an error.
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

  // GET /posts/:txid/thread. A txid that is not an indexed post resolves to
  // null so the caller can report a not-found failure and poll for it.
  async getThread (txid) {
    return this.getJson(`/posts/${encodeURIComponent(txid)}/thread`, { notFoundValue: null })
  }

  // GET /level/post/:txid. A txid with no stored post resolves to null so the
  // caller can report a not-found failure and poll for it.
  async getPost (txid) {
    return this.getJson(`/level/post/${encodeURIComponent(txid)}`, { notFoundValue: null })
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-07T02:26:44.275Z","module_hash":"3e49edd51c9fc61442913a629fa67e692ec85b44c955ff6d48932a9be9c2fe6d","functions":[{"id":"func/resolveMemoDbUrl","name":"resolveMemoDbUrl","line":17,"end_line":19,"hash":"8bd26bd83abf7abaeaec8ef09738c666c43f08cb50e571798578563c9b1b6135"},{"id":"func/MemoDb.constructor","name":"MemoDb.constructor","line":22,"end_line":26,"hash":"f4dabbe259a017147f340aa4e535e4862b286fd93c8a4bfbff3b610a85d4352a"},{"id":"func/MemoDb.endpoint","name":"MemoDb.endpoint","line":29,"end_line":31,"hash":"79076a85523e87c8f3cb26165a085f5994818d2c679632eac36e1b7ad25d5a6d"},{"id":"func/MemoDb.getRecentPosts","name":"MemoDb.getRecentPosts","line":34,"end_line":41,"hash":"0783c7ce0d8aa723cd8f991db39f145d011df63378ae01d6f21aa526fa2254f1"},{"id":"func/MemoDb.getProfile","name":"MemoDb.getProfile","line":44,"end_line":46,"hash":"5c171e82d00f3e8752b41a7faeb127343a10af8d6da26d219edbc797ad617c6d"},{"id":"func/MemoDb.getThread","name":"MemoDb.getThread","line":50,"end_line":52,"hash":"e195d5fa382ea5bfd88d81042848ae6f6eeb42f6537a8d054a18ffb12b2ecd82"},{"id":"func/MemoDb.getJson","name":"MemoDb.getJson","line":56,"end_line":74,"hash":"00155911d9a77adb326153aab05ed5140c9fb78c26108de2713cc5c1a115b167"}]}
// mutate4javascript-manifest-end
