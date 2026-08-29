/*
  Following Feed Page behavior: load and display top-level posts from
  profiles the viewer follows.

  This is the testable controller behind the React "Following" feed page. It
  wraps the MemoDb client, identifies the viewer from the injected wallet, and
  exposes the loaded posts so the view can render them like the recent feed.
*/

const FOLLOWING_FEED_PATH = '/posts/following'

class FollowingFeedPage {
  constructor (deps = {}) {
    this.memoDb = deps.memoDb || null
    this.wallet = deps.wallet || null
    this.posts = []
    this.pagination = null
    this.emptyBecauseNoFollows = false
  }

  getMyAddress () {
    return this.wallet?.walletInfo?.cashAddress || null
  }

  async load ({ limit = 100, offset = 0 } = {}) {
    if (!this.memoDb) {
      throw new Error('Following feed page requires a memo db client.')
    }

    const myAddr = this.getMyAddress()
    if (!myAddr) {
      throw new Error('Following feed page requires an authenticated wallet.')
    }

    const data = await this.memoDb.getFollowingFeed(myAddr, { limit, offset })
    this.posts = data.posts || []
    this.pagination = data.pagination || null
    this.emptyBecauseNoFollows = this.posts.length === 0 && offset === 0

    return { posts: this.posts, pagination: this.pagination, emptyBecauseNoFollows: this.emptyBecauseNoFollows }
  }

  canLoadMore () {
    return this.pagination?.hasMore ?? false
  }

  getPost (txid) {
    return this.posts.find((post) => post.txid === txid) || null
  }
}

FollowingFeedPage.FOLLOWING_FEED_PATH = FOLLOWING_FEED_PATH

module.exports = FollowingFeedPage
