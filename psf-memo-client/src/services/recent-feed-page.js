/*
  Recent Feed Page behavior: load and display the list of recent Memo posts.

  This is the testable controller behind the React "Recent Posts" page.  It
  wraps the MemoDb client and exposes the loaded posts so the view can render
  per-post data such as the like count.

  The memoDb concern is injected so this module stays free of UI/network
  concerns; environmentally unsuitable I/O lives behind that small adapter
  boundary.
*/

const RECENT_FEED_PATH = '/posts/recent'

class RecentFeedPage {
  constructor (deps = {}) {
    this.memoDb = deps.memoDb || null
    this.posts = []
    this.pagination = null
  }

  async load ({ limit = 100, offset = 0 } = {}) {
    if (!this.memoDb) {
      throw new Error('Recent feed page requires a memo db client.')
    }

    const data = await this.memoDb.getRecentPosts({ limit, offset })
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
