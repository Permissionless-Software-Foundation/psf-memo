/*
  Profile Page behavior: load and display a single address's Memo posts,
  follow state, and follow/unfollow controls.

  This is the testable controller behind the React "Profile" page.  It wraps
  the MemoDb client, targets a specific address, exposes the loaded posts,
  and coordinates follow state with an injected MemoFollow action.

  The memoDb, address, viewer address, and memoFollow concerns are injected so
  this module stays free of UI/network concerns; environmentally unsuitable
  I/O lives behind those small adapter boundaries.
*/

const PROFILE_PATH_PREFIX = '/profile'

class ProfilePage {
  constructor (deps = {}) {
    this.memoDb = deps.memoDb || null
    this.addr = deps.addr || null
    this.myAddr = deps.myAddr || null
    this.memoFollow = deps.memoFollow || null
    this.posts = []
    this.pagination = null
    this.followState = null
  }

  async load ({ limit = 100, offset = 0 } = {}) {
    this._assertReady()

    const data = await this.memoDb.getPostsByAddr(this.addr, { limit, offset })
    this.posts = data.posts || []
    this.pagination = data.pagination || null
    this.followState = await this._loadFollowState()

    return {
      posts: this.posts,
      pagination: this.pagination,
      followState: this.followState,
      isOwnProfile: this.isOwnProfile()
    }
  }

  // Throw unless the injected dependencies and target address are present.
  _assertReady () {
    if (!this.memoDb) {
      throw new Error('Profile page requires a memo db client.')
    }
    if (!this.addr) {
      throw new Error('Profile page requires an address.')
    }
  }

  // Fetch the viewer's follow state for the target address, or false when
  // there is no viewer or the profile is the viewer's own.
  async _loadFollowState () {
    if (this.myAddr && !this.isOwnProfile()) {
      return this.memoDb.getFollowState(this.myAddr, this.addr)
    }
    return false
  }

  isOwnProfile () {
    return Boolean(this.myAddr) && this.myAddr === this.addr
  }

  canFollow () {
    return Boolean(this.myAddr) && !this.isOwnProfile()
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

  // Delegate follow/unfollow to the injected handler and reflect the new state.
  async _setFollowState (method, nextState) {
    if (!this.memoFollow) {
      throw new Error('Profile page requires a memo follow handler.')
    }
    await this.memoFollow[method](this.addr)
    this.followState = nextState
    return { ok: true }
  }

  getPost (txid) {
    return this.posts.find((post) => post.txid === txid) || null
  }
}

ProfilePage.PROFILE_PATH_PREFIX = PROFILE_PATH_PREFIX

module.exports = ProfilePage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T17:41:02.811Z","module_hash":"556ad5297067de3e39ddbb028a87d502cc0a9ab6525b1bba2c3d36c669207e1d","functions":[{"id":"func/ProfilePage.constructor","name":"ProfilePage.constructor","line":17,"end_line":25,"hash":"5e8bd826d8059e2d86aa3064c7b7d3041d5cf2fff7eb8942976bda600d2812a2"},{"id":"func/ProfilePage.load","name":"ProfilePage.load","line":27,"end_line":41,"hash":"e6c81ab6dbfda80903b134bdfea626d7e82e567780fd577d7a78e6dd44a22f37"},{"id":"func/ProfilePage._assertReady","name":"ProfilePage._assertReady","line":44,"end_line":51,"hash":"e575f98fa1b492b4c11ae5275459d9f9996df4c566b84c7cae91413c72a02f38"},{"id":"func/ProfilePage._loadFollowState","name":"ProfilePage._loadFollowState","line":55,"end_line":60,"hash":"65ff871041cab36b5e45acad5c8ca904c411af197f77dbb528e31ac5666668b3"},{"id":"func/ProfilePage.isOwnProfile","name":"ProfilePage.isOwnProfile","line":62,"end_line":64,"hash":"4d149bfe7b183b5d38d496c0a8126d22bd9a919e684f375d66e2c8c1348dd773"},{"id":"func/ProfilePage.canFollow","name":"ProfilePage.canFollow","line":66,"end_line":68,"hash":"0bc2c0c17991d8f1a1d18fba29c901e42633b7cf2c2c8b5747a49e5832d7001d"},{"id":"func/ProfilePage.isFollowing","name":"ProfilePage.isFollowing","line":70,"end_line":72,"hash":"9fc0470db7ffea2da96d2dbbdceff55562e1f7e84377fbb0e8b60d53cc723b40"},{"id":"func/ProfilePage.follow","name":"ProfilePage.follow","line":74,"end_line":76,"hash":"7674b789a9d3c48e0f7a6e553613bac99b2f38449fcdd17faa3c6d7cd2773bdd"},{"id":"func/ProfilePage.unfollow","name":"ProfilePage.unfollow","line":78,"end_line":80,"hash":"69d278b09da1f284be6adacb7264f9c06ac71c42f8e8f1baf9e34d5b24a891fb"},{"id":"func/ProfilePage._setFollowState","name":"ProfilePage._setFollowState","line":83,"end_line":90,"hash":"8eda1a436468b17327e8e20df4f84bf0263591f320c494f2c74c1b5be21b2ad8"},{"id":"func/ProfilePage.getPost","name":"ProfilePage.getPost","line":92,"end_line":94,"hash":"1a6ae1a02b0f79b5b62a2b2324a5f1edbd743bec004fe73cfef7970bead56885"}]}
// mutate4javascript-manifest-end
