/*
  Search Page behavior: capture a query, submit it, and display results.

  This is the testable controller behind the React Search page. It wraps the
  MemoDb client and exposes the returned posts and profiles so the view can
  render them. Search is read-only and does not require a wallet.
*/

const SEARCH_PATH = '/search'

class SearchPage {
  constructor (deps = {}) {
    this.memoDb = deps.memoDb || null
    this.navigate = deps.navigate || (() => {})
    this.query = ''
    this.posts = []
    this.profiles = []
    this.pagination = null
  }

  setQuery (q) {
    this.query = typeof q === 'string' ? q.trim() : ''
    return this
  }

  async submit ({ limit = 100, offset = 0 } = {}) {
    if (!this.memoDb) {
      throw new Error('Search page requires a memo db client.')
    }

    const data = await this.memoDb.search(this.query, { limit, offset })
    this.posts = data.posts || []
    this.profiles = data.profiles || []
    this.pagination = data.pagination || null

    return {
      posts: this.posts,
      profiles: this.profiles,
      pagination: this.pagination
    }
  }

  getPost (txid) {
    return this.posts.find((post) => post.txid === txid) || null
  }

  getProfile (addr) {
    return this.profiles.find((profile) => profile.addr === addr) || null
  }
}

SearchPage.SEARCH_PATH = SEARCH_PATH

module.exports = SearchPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-29T15:29:31.910Z","module_hash":"5ff867161b6e0af82435936924bfc3f2843e94b60354bbb39833714adb2a7448","functions":[{"id":"func/SearchPage.constructor","name":"SearchPage.constructor","line":12,"end_line":19,"hash":"6e48e42aae340ec24012bd86529d4493664e896d0d86a0bcfaf75e813d196da7"},{"id":"func/SearchPage.setQuery","name":"SearchPage.setQuery","line":21,"end_line":24,"hash":"45cdbb5a6cc4329f2ae2918130de995482f5587efdfa8bf48191672c0917cab3"},{"id":"func/SearchPage.submit","name":"SearchPage.submit","line":26,"end_line":41,"hash":"2e1394b99ec30f3b0fb867ab45c07c439c0d71ecef868dd37bfd7af11c584a2a"},{"id":"func/SearchPage.getPost","name":"SearchPage.getPost","line":43,"end_line":45,"hash":"1a6ae1a02b0f79b5b62a2b2324a5f1edbd743bec004fe73cfef7970bead56885"},{"id":"func/SearchPage.getProfile","name":"SearchPage.getProfile","line":47,"end_line":49,"hash":"c93f06a279f8976938fc8b91ce24e9e742c700ac6ff271328192dba9140ae195"}]}
// mutate4javascript-manifest-end
