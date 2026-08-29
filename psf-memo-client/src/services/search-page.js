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
