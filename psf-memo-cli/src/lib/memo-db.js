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

// Serialize the defined query parameters in insertion order. A null viewer
// (the "no filter" value) is dropped, so every paginated route builds its
// query the same way instead of repeating the limit/offset/viewer wiring.
function toQuery (params) {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    query.set(key, String(value))
  }

  return query.toString()
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
    return this.getJson(`/posts/recent?${toQuery({ limit, offset, viewer: viewer || null })}`)
  }

  // GET a paginated, address-scoped /posts route.
  getAddrPage (path, addr, { limit = 50, offset = 0 } = {}) {
    return this.getJson(`/posts/${path}/${encodeURIComponent(addr)}?${toQuery({ limit, offset })}`)
  }

  // GET /posts/notifications/:addr. Returns the wallet address's notification
  // page (type, action txid, actor, optional post/text) with the service
  // pagination.
  async getNotifications (addr, page = {}) {
    return this.getAddrPage('notifications', addr, page)
  }

  // GET /posts/by/:addr. Returns one page of the address's top-level posts.
  async getPostsByAddr (addr, page = {}) {
    return this.getAddrPage('by', addr, page)
  }

  // GET /follow/state?follower=&followee=. Returns the follow state document.
  async getFollowState (follower, followee) {
    return this.getJson(`/follow/state?${toQuery({ follower, followee })}`)
  }

  // GET /topics. Returns one page of the topic list with the service pagination.
  async getTopics ({ limit = 50, offset = 0 } = {}) {
    return this.getJson(`/topics?${toQuery({ limit, offset })}`)
  }

  // GET /topics/:room/posts, optionally viewer-filtered. Returns one page of the
  // topic's posts with the service pagination.
  async getTopicPosts (room, { limit = 50, offset = 0, viewer = null } = {}) {
    return this.getJson(`/topics/${encodeURIComponent(room)}/posts?${toQuery({ limit, offset, viewer: viewer || null })}`)
  }

  // GET /search. Returns one page of matching top-level posts and profiles with
  // the service pagination. The optional viewer filters the posts by the
  // viewer's mutes (profiles are not mute-filtered).
  async search (query, { limit = 50, offset = 0, viewer = null } = {}) {
    return this.getJson(`/search?${toQuery({ q: query, limit, offset, viewer: viewer || null })}`)
  }

  // GET /profile/recent. Returns one page of recently active profiles (address,
  // bio text, display name, avatar URL, provenance txid, and the most recent
  // qualifying post's block height and seen) with the service pagination.
  async getRecentProfiles ({ limit = 50, offset = 0 } = {}) {
    return this.getJson(`/profile/recent?${toQuery({ limit, offset })}`)
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
// {"version":1,"tested_at":"2026-10-08T00:27:25.938Z","module_hash":"6e34f2499248c511e4b8e897a7c152d262505568109c976722fdd2bb8071336e","functions":[{"id":"func/resolveMemoDbUrl","name":"resolveMemoDbUrl","line":17,"end_line":19,"hash":"8bd26bd83abf7abaeaec8ef09738c666c43f08cb50e571798578563c9b1b6135"},{"id":"func/toQuery","name":"toQuery","line":24,"end_line":33,"hash":"0e7b6d2b10fbead6128159b5c1fa95dcc3ddd0c8c7f4a2d570783bf3f481b5f2"},{"id":"func/MemoDb.constructor","name":"MemoDb.constructor","line":36,"end_line":40,"hash":"f4dabbe259a017147f340aa4e535e4862b286fd93c8a4bfbff3b610a85d4352a"},{"id":"func/MemoDb.endpoint","name":"MemoDb.endpoint","line":43,"end_line":45,"hash":"79076a85523e87c8f3cb26165a085f5994818d2c679632eac36e1b7ad25d5a6d"},{"id":"func/MemoDb.getRecentPosts","name":"MemoDb.getRecentPosts","line":48,"end_line":50,"hash":"9b6a32139f43a25405ff11a480943da32dcbac33b2e24fbcf4bc981ccbccc3f4"},{"id":"func/MemoDb.getAddrPage","name":"MemoDb.getAddrPage","line":53,"end_line":55,"hash":"b9b304987cc0c6ee9fdc77ecd1f020465b43328015a455702415be0bb8517862"},{"id":"func/MemoDb.getNotifications","name":"MemoDb.getNotifications","line":60,"end_line":62,"hash":"5a88c925a57ed3acd9312d89abb7bf945c6e356742010d88e043541edbcda3a7"},{"id":"func/MemoDb.getPostsByAddr","name":"MemoDb.getPostsByAddr","line":65,"end_line":67,"hash":"a914e7dc7235e60034d21a495fa6958d430e8ddb1a52581de34b8a912fb64a70"},{"id":"func/MemoDb.getFollowState","name":"MemoDb.getFollowState","line":70,"end_line":72,"hash":"3f38685d78fce2ebd0a57ea6b1c3d9fb9cd9d2265033742d7ad2b9afe397cc32"},{"id":"func/MemoDb.getTopics","name":"MemoDb.getTopics","line":75,"end_line":77,"hash":"6fac9b735a70b47922c040cd646ad6b318eb621711b4572d7c9e3e5c97bebc0e"},{"id":"func/MemoDb.getTopicPosts","name":"MemoDb.getTopicPosts","line":81,"end_line":83,"hash":"5f277b4ae197ae8dc236de06d587148ace9e76c60a3a030978d2192845f2b249"},{"id":"func/MemoDb.search","name":"MemoDb.search","line":88,"end_line":90,"hash":"7432f181255ed601056f9e5c293eebab6003aeffdfb2a85a2e9469a7f5e963aa"},{"id":"func/MemoDb.getProfile","name":"MemoDb.getProfile","line":93,"end_line":95,"hash":"5c171e82d00f3e8752b41a7faeb127343a10af8d6da26d219edbc797ad617c6d"},{"id":"func/MemoDb.getName","name":"MemoDb.getName","line":98,"end_line":100,"hash":"1c893ee4ac4bbdb903132b570c19ae8761487d3185191cb865db41e96483c80f"},{"id":"func/MemoDb.getProfilePic","name":"MemoDb.getProfilePic","line":103,"end_line":105,"hash":"7cc8df397be7c617a378b933c07fafaedbd2ee669ce723d68ef6a7897a18fad1"},{"id":"func/MemoDb.getThread","name":"MemoDb.getThread","line":109,"end_line":111,"hash":"e195d5fa382ea5bfd88d81042848ae6f6eeb42f6537a8d054a18ffb12b2ecd82"},{"id":"func/MemoDb.getPost","name":"MemoDb.getPost","line":115,"end_line":117,"hash":"78e6058e55e17b83693c769c9de21a32bde35bbf24bf490e21d3207b4a4d669d"},{"id":"func/MemoDb.getStatus","name":"MemoDb.getStatus","line":121,"end_line":123,"hash":"4247c054f8e04bfc63a7347fb4a27d7798fe04a38c339f61f61eb9039f1019ba"},{"id":"func/MemoDb.getJson","name":"MemoDb.getJson","line":127,"end_line":145,"hash":"00155911d9a77adb326153aab05ed5140c9fb78c26108de2713cc5c1a115b167"}]}
// mutate4javascript-manifest-end
