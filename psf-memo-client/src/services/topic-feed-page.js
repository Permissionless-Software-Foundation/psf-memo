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
}

TopicFeedPage.topicFeedPath = function (room) {
  return `/topics/${encodeURIComponent(room)}`
}

module.exports = TopicFeedPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T18:24:48.504Z","module_hash":"236ec55785bb69ac64c4a610ef4a5f8a8b03fae7b717d79c14c7fd2e755775e6","functions":[{"id":"func/TopicFeedPage.constructor","name":"TopicFeedPage.constructor","line":10,"end_line":19,"hash":"e6ee69c9caa13fcc05c7739fc185767f906c907a3031cf2c02abaab9220daca5"},{"id":"func/TopicFeedPage.load","name":"TopicFeedPage.load","line":21,"end_line":36,"hash":"ef85636d06f2b1eb6afd19b276bd8b9728ee35122d4424b3faf468de4a0e23a4"},{"id":"func/TopicFeedPage._loadFollowState","name":"TopicFeedPage._loadFollowState","line":38,"end_line":43,"hash":"d1984bb94b4f2e7c98c39524fc2fd0080dc5cff10e775a17c68856c2e3a2c249"},{"id":"func/TopicFeedPage._loadFollowers","name":"TopicFeedPage._loadFollowers","line":45,"end_line":47,"hash":"8b19d3623b4a872f4abe879ceda7e4018edf60efff03d037fe795b6558222b37"},{"id":"func/TopicFeedPage.canFollow","name":"TopicFeedPage.canFollow","line":49,"end_line":51,"hash":"2f82c2096bf6f542b60cf20d82cd70f366652fcce3a38ff14e82164d5ee86cad"},{"id":"func/TopicFeedPage.isFollowing","name":"TopicFeedPage.isFollowing","line":53,"end_line":55,"hash":"9fc0470db7ffea2da96d2dbbdceff55562e1f7e84377fbb0e8b60d53cc723b40"},{"id":"func/TopicFeedPage.follow","name":"TopicFeedPage.follow","line":57,"end_line":59,"hash":"7674b789a9d3c48e0f7a6e553613bac99b2f38449fcdd17faa3c6d7cd2773bdd"},{"id":"func/TopicFeedPage.unfollow","name":"TopicFeedPage.unfollow","line":61,"end_line":63,"hash":"69d278b09da1f284be6adacb7264f9c06ac71c42f8e8f1baf9e34d5b24a891fb"},{"id":"func/TopicFeedPage._setFollowState","name":"TopicFeedPage._setFollowState","line":65,"end_line":79,"hash":"698f22cdfc2c088446c732cf01864d8859b299e066c199eb542bc965413f48b4"},{"id":"func/TopicFeedPage.getPost","name":"TopicFeedPage.getPost","line":81,"end_line":83,"hash":"1a6ae1a02b0f79b5b62a2b2324a5f1edbd743bec004fe73cfef7970bead56885"}]}
// mutate4javascript-manifest-end
