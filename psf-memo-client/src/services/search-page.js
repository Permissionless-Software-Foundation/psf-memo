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
    this.wallet = deps.wallet || null
    this.navigate = deps.navigate || (() => {})
    this.query = ''
    this.posts = []
    this.profiles = []
    this.pagination = null
  }

  getMyAddress () {
    return this.wallet?.walletInfo?.cashAddress || null
  }

  setQuery (q) {
    this.query = typeof q === 'string' ? q.trim() : ''
    return this
  }

  async submit ({ limit = 50, offset = 0 } = {}) {
    if (!this.memoDb) {
      throw new Error('Search page requires a memo db client.')
    }

    const opts = { limit, offset }
    const viewer = this.getMyAddress()
    if (viewer) opts.viewer = viewer
    const data = await this.memoDb.search(this.query, opts)
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

  canLoadMore () {
    return this.pagination?.hasMore ?? false
  }
}

SearchPage.SEARCH_PATH = SEARCH_PATH

module.exports = SearchPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-04T20:32:36.452Z","module_hash":"7d51ff369a457d9facfe510f1fe3f66ced70cd40bb033d507cbe48eae72c7716","functions":[{"id":"func/SearchPage.constructor","name":"SearchPage.constructor","line":12,"end_line":20,"hash":"1cd1ad4bc4c9cd04bf99d45bf6eb4143cfb8102d96a66f36980756782dd2b06f"},{"id":"func/SearchPage.getMyAddress","name":"SearchPage.getMyAddress","line":22,"end_line":24,"hash":"3e5d4ac4df379300933a772020528b4ecf4ed83c7386a066f5c270df81adcddd"},{"id":"func/SearchPage.setQuery","name":"SearchPage.setQuery","line":26,"end_line":29,"hash":"45cdbb5a6cc4329f2ae2918130de995482f5587efdfa8bf48191672c0917cab3"},{"id":"func/SearchPage.submit","name":"SearchPage.submit","line":31,"end_line":49,"hash":"377db726c6826bc8cfff93b5cef140f3ad7c91f448d14d7acce436e2081196c5"},{"id":"func/SearchPage.getPost","name":"SearchPage.getPost","line":51,"end_line":53,"hash":"1a6ae1a02b0f79b5b62a2b2324a5f1edbd743bec004fe73cfef7970bead56885"},{"id":"func/SearchPage.getProfile","name":"SearchPage.getProfile","line":55,"end_line":57,"hash":"c93f06a279f8976938fc8b91ce24e9e742c700ac6ff271328192dba9140ae195"},{"id":"func/SearchPage.canLoadMore","name":"SearchPage.canLoadMore","line":59,"end_line":61,"hash":"634983bcc6bbe560daad8326db0dd4bf31d5cb9e45c40112565351dceaf8e5d5"}]}
// mutate4javascript-manifest-end
