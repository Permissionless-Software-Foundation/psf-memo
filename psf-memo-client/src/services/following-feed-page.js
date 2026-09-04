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

  async load ({ limit = 50, offset = 0 } = {}) {
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-04T17:10:16.507Z","module_hash":"e30a0befd791a2a6adfc48239339ec7655dfdce56699653d4c7d85b6a39cedfd","functions":[{"id":"func/FollowingFeedPage.constructor","name":"FollowingFeedPage.constructor","line":13,"end_line":19,"hash":"015246f47e903cfc98029de709dbf4b0c0a47999c2ad737acfa3f46c17d66381"},{"id":"func/FollowingFeedPage.getMyAddress","name":"FollowingFeedPage.getMyAddress","line":21,"end_line":23,"hash":"3e5d4ac4df379300933a772020528b4ecf4ed83c7386a066f5c270df81adcddd"},{"id":"func/FollowingFeedPage.load","name":"FollowingFeedPage.load","line":25,"end_line":41,"hash":"f61377da944c0bc716d03ef0ad97c4c62d0aeb1b2b47788093ededa7f58545f5"},{"id":"func/FollowingFeedPage.canLoadMore","name":"FollowingFeedPage.canLoadMore","line":43,"end_line":45,"hash":"634983bcc6bbe560daad8326db0dd4bf31d5cb9e45c40112565351dceaf8e5d5"},{"id":"func/FollowingFeedPage.getPost","name":"FollowingFeedPage.getPost","line":47,"end_line":49,"hash":"1a6ae1a02b0f79b5b62a2b2324a5f1edbd743bec004fe73cfef7970bead56885"}]}
// mutate4javascript-manifest-end
