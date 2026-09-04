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

  async load ({ limit = 50, offset = 0 } = {}) {
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

  canLoadMore () {
    return this.pagination?.hasMore ?? false
  }
}

RecentFeedPage.RECENT_FEED_PATH = RECENT_FEED_PATH

module.exports = RecentFeedPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T03:38:52.144Z","module_hash":"e2ee3beff9079c7f93d29043b1428c271fbd1a2b64f2635fbc2cc06fb52a3aab","functions":[{"id":"func/RecentFeedPage.constructor","name":"RecentFeedPage.constructor","line":16,"end_line":20,"hash":"0eb6faf1dfd73ad95b210473ab82fdae513ff1570e401820645661881a2f8d4b"},{"id":"func/RecentFeedPage.load","name":"RecentFeedPage.load","line":22,"end_line":32,"hash":"96e8f2c77aadf98e3a9e71e1f0f6ce98a3e47dd828ffb4626916f56ca32ed137"},{"id":"func/RecentFeedPage.getPost","name":"RecentFeedPage.getPost","line":34,"end_line":36,"hash":"1a6ae1a02b0f79b5b62a2b2324a5f1edbd743bec004fe73cfef7970bead56885"}]}
// mutate4javascript-manifest-end
