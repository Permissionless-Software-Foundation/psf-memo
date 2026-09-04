/*
  Recent Feed Page behavior: load and display the list of recent Memo posts.

  This is the testable controller behind the React "Recent Posts" page.  It
  wraps the MemoDb client and exposes the loaded posts so the view can render
  per-post data such as the like count.

  The memoDb concern is injected so this module stays free of UI/network
  concerns; environmentally unsuitable I/O lives behind that small adapter
  boundary.
*/

const PaginatedPage = require('./paginated-page')

const RECENT_FEED_PATH = '/posts/recent'

class RecentFeedPage extends PaginatedPage {
  constructor (deps = {}) {
    super(deps, {
      listField: 'posts',
      loadMethod: 'getRecentPosts',
      errorMessage: 'Recent feed page requires a memo db client.'
    })
    this.wallet = deps.wallet || null
  }

  getMyAddress () {
    return this.wallet?.walletInfo?.cashAddress || null
  }

  async load ({ limit = 50, offset = 0 } = {}) {
    if (!this.memoDb) {
      throw new Error('Recent feed page requires a memo db client.')
    }

    const opts = { limit, offset }
    const viewer = this.getMyAddress()
    if (viewer) opts.viewer = viewer
    const data = await this.memoDb.getRecentPosts(opts)
    this.posts = data.posts || []
    this.pagination = data.pagination || null

    return { posts: this.posts, pagination: this.pagination }
  }

  getPost (txid) {
    return this.posts.find((post) => post.txid === txid) || null
  }
}

RecentFeedPage.RECENT_FEED_PATH = RECENT_FEED_PATH

module.exports = RecentFeedPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-04T17:09:10.548Z","module_hash":"9c0c48d7b21d24fcf640bf461b9798b2377097687c433be64776495ab7166601","functions":[{"id":"func/RecentFeedPage.constructor","name":"RecentFeedPage.constructor","line":18,"end_line":24,"hash":"78adbb7be7ccdc136fb6bb9201a8447b0a484f525a7426f25f281b0ecd78c0ae"},{"id":"func/RecentFeedPage.getPost","name":"RecentFeedPage.getPost","line":26,"end_line":28,"hash":"1a6ae1a02b0f79b5b62a2b2324a5f1edbd743bec004fe73cfef7970bead56885"}]}
// mutate4javascript-manifest-end
