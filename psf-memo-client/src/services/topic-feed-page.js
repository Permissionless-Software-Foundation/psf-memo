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
    this.myAddr = deps.myAddr || null
    this.memoTopicFollow = deps.memoTopicFollow || null
    this.posts = []
    this.pagination = null
    this.followState = false
    this.followers = []
  }

  async load ({ limit = 50, offset = 0 } = {}) {
    if (!this.memoDb) {
      throw new Error('Topic feed page requires a memo db client.')
    }
    if (!this.room) {
      throw new Error('Topic feed page requires a topic room.')
    }

    const opts = { limit, offset }
    if (this.myAddr) opts.viewer = this.myAddr
    const data = await this.memoDb.getTopicPosts(this.room, opts)
    this.posts = data.posts || []
    this.pagination = data.pagination || null
    this.followState = await this._loadFollowState()
    this.followers = await this._loadFollowers()

    return { posts: this.posts, pagination: this.pagination, followState: this.followState, followers: this.followers }
  }

  async _loadFollowState () {
    if (this.myAddr) {
      return this.memoDb.getTopicFollowState(this.room, this.myAddr)
    }
    return false
  }

  async _loadFollowers () {
    return this.memoDb.getTopicFollowers(this.room)
  }

  canFollow () {
    return Boolean(this.myAddr)
  }

  isFollowing () {
    return this.followState === true
  }

  async follow () {
    return this._setFollowState('follow', true)
  }

  async unfollow () {
    return this._setFollowState('unfollow', false)
  }

  async _setFollowState (method, nextState) {
    if (!this.memoTopicFollow) {
      throw new Error('Topic feed page requires a memo topic follow handler.')
    }
    await this.memoTopicFollow[method](this.room)
    this.followState = nextState
    if (nextState) {
      if (!this.followers.includes(this.myAddr)) {
        this.followers = [...this.followers, this.myAddr]
      }
    } else {
      this.followers = this.followers.filter((addr) => addr !== this.myAddr)
    }
    return { ok: true }
  }

  getPost (txid) {
    return this.posts.find((post) => post.txid === txid) || null
  }

  canLoadMore () {
    return this.pagination?.hasMore ?? false
  }
}

TopicFeedPage.topicFeedPath = function (room) {
  return `/topics/${encodeURIComponent(room)}`
}

module.exports = TopicFeedPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-04T20:31:07.193Z","module_hash":"11ccacb1de2e8d6fad9776fb1e0d7fd2576271f997988ae7ca6238b7056a7560","functions":[{"id":"func/TopicFeedPage.constructor","name":"TopicFeedPage.constructor","line":10,"end_line":19,"hash":"e6ee69c9caa13fcc05c7739fc185767f906c907a3031cf2c02abaab9220daca5"},{"id":"func/TopicFeedPage.load","name":"TopicFeedPage.load","line":21,"end_line":38,"hash":"e69f809865ef0f931b86c524d2ca17e0b2fb8af6afdfb95071a5728458348ff8"},{"id":"func/TopicFeedPage._loadFollowState","name":"TopicFeedPage._loadFollowState","line":40,"end_line":45,"hash":"d1984bb94b4f2e7c98c39524fc2fd0080dc5cff10e775a17c68856c2e3a2c249"},{"id":"func/TopicFeedPage._loadFollowers","name":"TopicFeedPage._loadFollowers","line":47,"end_line":49,"hash":"8b19d3623b4a872f4abe879ceda7e4018edf60efff03d037fe795b6558222b37"},{"id":"func/TopicFeedPage.canFollow","name":"TopicFeedPage.canFollow","line":51,"end_line":53,"hash":"2f82c2096bf6f542b60cf20d82cd70f366652fcce3a38ff14e82164d5ee86cad"},{"id":"func/TopicFeedPage.isFollowing","name":"TopicFeedPage.isFollowing","line":55,"end_line":57,"hash":"9fc0470db7ffea2da96d2dbbdceff55562e1f7e84377fbb0e8b60d53cc723b40"},{"id":"func/TopicFeedPage.follow","name":"TopicFeedPage.follow","line":59,"end_line":61,"hash":"7674b789a9d3c48e0f7a6e553613bac99b2f38449fcdd17faa3c6d7cd2773bdd"},{"id":"func/TopicFeedPage.unfollow","name":"TopicFeedPage.unfollow","line":63,"end_line":65,"hash":"69d278b09da1f284be6adacb7264f9c06ac71c42f8e8f1baf9e34d5b24a891fb"},{"id":"func/TopicFeedPage._setFollowState","name":"TopicFeedPage._setFollowState","line":67,"end_line":81,"hash":"698f22cdfc2c088446c732cf01864d8859b299e066c199eb542bc965413f48b4"},{"id":"func/TopicFeedPage.getPost","name":"TopicFeedPage.getPost","line":83,"end_line":85,"hash":"1a6ae1a02b0f79b5b62a2b2324a5f1edbd743bec004fe73cfef7970bead56885"},{"id":"func/TopicFeedPage.canLoadMore","name":"TopicFeedPage.canLoadMore","line":87,"end_line":89,"hash":"634983bcc6bbe560daad8326db0dd4bf31d5cb9e45c40112565351dceaf8e5d5"}]}
// mutate4javascript-manifest-end
