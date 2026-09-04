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
// {"version":1,"tested_at":"2026-09-04T20:30:15.023Z","module_hash":"ddf0eb40d3e2b94b38280e05332c101911cc63573d6f762c2839ec85b595490b","functions":[{"id":"func/RecentFeedPage.constructor","name":"RecentFeedPage.constructor","line":18,"end_line":25,"hash":"8f47167ab6c76f97b03c6d09cb806c0d816f83f7b78d12b5123c5bb7502221eb"},{"id":"func/RecentFeedPage.getMyAddress","name":"RecentFeedPage.getMyAddress","line":27,"end_line":29,"hash":"3e5d4ac4df379300933a772020528b4ecf4ed83c7386a066f5c270df81adcddd"},{"id":"func/RecentFeedPage.load","name":"RecentFeedPage.load","line":31,"end_line":44,"hash":"60261664395bc75f1a995611181b62e6ba263cf1132d9ddf50e1824a7b0f201a"},{"id":"func/RecentFeedPage.getPost","name":"RecentFeedPage.getPost","line":46,"end_line":48,"hash":"1a6ae1a02b0f79b5b62a2b2324a5f1edbd743bec004fe73cfef7970bead56885"}]}
// mutate4javascript-manifest-end
