/*
  Topic Feed Page behavior: load and display the posts for a single Memo topic.

  This is the testable controller behind the React "Topic Feed" page. It wraps
  the MemoDb client, targets a specific topic room, and exposes the loaded posts
  so the view can render per-post data such as the like count.
*/

class TopicFeedPage {
  constructor (deps = {}) {
    this.memoDb = deps.memoDb || null
    this.room = deps.room || null
    this.posts = []
    this.pagination = null
  }

  async load ({ limit = 100, offset = 0 } = {}) {
    if (!this.memoDb) {
      throw new Error('Topic feed page requires a memo db client.')
    }
    if (!this.room) {
      throw new Error('Topic feed page requires a topic room.')
    }

    const data = await this.memoDb.getTopicPosts(this.room, { limit, offset })
    this.posts = data.posts || []
    this.pagination = data.pagination || null

    return { posts: this.posts, pagination: this.pagination }
  }

  getPost (txid) {
    return this.posts.find((post) => post.txid === txid) || null
  }
}

TopicFeedPage.topicFeedPath = function (room) {
  return `/topics/${encodeURIComponent(room)}`
}

module.exports = TopicFeedPage
