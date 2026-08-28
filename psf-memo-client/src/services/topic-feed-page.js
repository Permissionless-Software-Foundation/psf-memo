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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T15:35:01.465Z","module_hash":"d6433e58dfe8e7d0095074424340477c0abcfdcac7f611e2267ed04232936a1d","functions":[{"id":"func/TopicFeedPage.constructor","name":"TopicFeedPage.constructor","line":10,"end_line":15,"hash":"5d839555bdd88de97e47d68ef4dd2bad3a657ec4f9ce93991d332902bb4c371e"},{"id":"func/TopicFeedPage.load","name":"TopicFeedPage.load","line":17,"end_line":30,"hash":"ddf4ed21448879fa579225491125e343ebc129ef08445da811d98e79c6c29042"},{"id":"func/TopicFeedPage.getPost","name":"TopicFeedPage.getPost","line":32,"end_line":34,"hash":"1a6ae1a02b0f79b5b62a2b2324a5f1edbd743bec004fe73cfef7970bead56885"}]}
// mutate4javascript-manifest-end
