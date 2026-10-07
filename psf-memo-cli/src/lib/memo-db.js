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

  // GET /posts/notifications/:addr. Returns the wallet address's notification
  // page (type, action txid, actor, optional post/text) with the service
  // pagination.
  async getNotifications (addr, { limit = 50, offset = 0 } = {}) {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    params.set('offset', String(offset))

    return this.getJson(`/posts/notifications/${encodeURIComponent(addr)}?${params.toString()}`)
  }

  // GET /level/profile/:addr. A missing profile resolves to null.
  async getProfile (addr) {
    return this.getJson(`/level/profile/${encodeURIComponent(addr)}`, { notFoundValue: null })
  }

  // GET /level/name/:addr. A missing name resolves to null.
  async getName (addr) {
    return this.getJson(`/level/name/${encodeURIComponent(addr)}`, { notFoundValue: null })
  }

  // GET /level/profilepic/:addr. A missing profile picture resolves to null.
  async getProfilePic (addr) {
    return this.getJson(`/level/profilepic/${encodeURIComponent(addr)}`, { notFoundValue: null })
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

  // GET /level/status/status. A missing status record resolves to null so the
  // caller can report a not-found failure.
  async getStatus () {
    return this.getJson('/level/status/status', { notFoundValue: null })
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
// {"version":1,"tested_at":"2026-10-07T15:06:45.348Z","module_hash":"c541dea2c6fdc4f84d3e3a8b3d07e3ccf9cffa144b8b622c350cccf451bb7445","functions":[{"id":"func/resolveMemoDbUrl","name":"resolveMemoDbUrl","line":17,"end_line":19,"hash":"8bd26bd83abf7abaeaec8ef09738c666c43f08cb50e571798578563c9b1b6135"},{"id":"func/MemoDb.constructor","name":"MemoDb.constructor","line":22,"end_line":26,"hash":"f4dabbe259a017147f340aa4e535e4862b286fd93c8a4bfbff3b610a85d4352a"},{"id":"func/MemoDb.endpoint","name":"MemoDb.endpoint","line":29,"end_line":31,"hash":"79076a85523e87c8f3cb26165a085f5994818d2c679632eac36e1b7ad25d5a6d"},{"id":"func/MemoDb.getRecentPosts","name":"MemoDb.getRecentPosts","line":34,"end_line":41,"hash":"0783c7ce0d8aa723cd8f991db39f145d011df63378ae01d6f21aa526fa2254f1"},{"id":"func/MemoDb.getProfile","name":"MemoDb.getProfile","line":44,"end_line":46,"hash":"5c171e82d00f3e8752b41a7faeb127343a10af8d6da26d219edbc797ad617c6d"},{"id":"func/MemoDb.getName","name":"MemoDb.getName","line":49,"end_line":51,"hash":"1c893ee4ac4bbdb903132b570c19ae8761487d3185191cb865db41e96483c80f"},{"id":"func/MemoDb.getProfilePic","name":"MemoDb.getProfilePic","line":54,"end_line":56,"hash":"7cc8df397be7c617a378b933c07fafaedbd2ee669ce723d68ef6a7897a18fad1"},{"id":"func/MemoDb.getThread","name":"MemoDb.getThread","line":60,"end_line":62,"hash":"e195d5fa382ea5bfd88d81042848ae6f6eeb42f6537a8d054a18ffb12b2ecd82"},{"id":"func/MemoDb.getPost","name":"MemoDb.getPost","line":66,"end_line":68,"hash":"78e6058e55e17b83693c769c9de21a32bde35bbf24bf490e21d3207b4a4d669d"},{"id":"func/MemoDb.getStatus","name":"MemoDb.getStatus","line":72,"end_line":74,"hash":"4247c054f8e04bfc63a7347fb4a27d7798fe04a38c339f61f61eb9039f1019ba"},{"id":"func/MemoDb.getJson","name":"MemoDb.getJson","line":78,"end_line":96,"hash":"00155911d9a77adb326153aab05ed5140c9fb78c26108de2713cc5c1a115b167"}]}
// mutate4javascript-manifest-end
