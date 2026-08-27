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
    if (!this.memoDb) {
      throw new Error('Profile page requires a memo db client.')
    }
    if (!this.addr) {
      throw new Error('Profile page requires an address.')
    }

    const data = await this.memoDb.getPostsByAddr(this.addr, { limit, offset })
    this.posts = data.posts || []
    this.pagination = data.pagination || null

    if (this.myAddr && !this.isOwnProfile()) {
      this.followState = await this.memoDb.getFollowState(this.myAddr, this.addr)
    } else {
      this.followState = false
    }

    return {
      posts: this.posts,
      pagination: this.pagination,
      followState: this.followState,
      isOwnProfile: this.isOwnProfile()
    }
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
    if (!this.memoFollow) {
      throw new Error('Profile page requires a memo follow handler.')
    }
    await this.memoFollow.follow(this.addr)
    this.followState = true
    return { ok: true }
  }

  async unfollow () {
    if (!this.memoFollow) {
      throw new Error('Profile page requires a memo follow handler.')
    }
    await this.memoFollow.unfollow(this.addr)
    this.followState = false
    return { ok: true }
  }

  getPost (txid) {
    return this.posts.find((post) => post.txid === txid) || null
  }
}

ProfilePage.PROFILE_PATH_PREFIX = PROFILE_PATH_PREFIX

module.exports = ProfilePage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T03:38:35.169Z","module_hash":"3d7b866f2997caa538addbc83086aec9b697f318a83cdc976d7f976cefa38e99","functions":[{"id":"func/ProfilePage.constructor","name":"ProfilePage.constructor","line":16,"end_line":21,"hash":"7c71c8c700d9f388b7a6904b8b3fae0f4c50e23288e96ac90e26f89797c16136"},{"id":"func/ProfilePage.load","name":"ProfilePage.load","line":23,"end_line":36,"hash":"6ccf9d1559cc12ba56d876cf68c2b0f369f195ec2d1058451c0b3bb9dcd3a515"},{"id":"func/ProfilePage.getPost","name":"ProfilePage.getPost","line":38,"end_line":40,"hash":"1a6ae1a02b0f79b5b62a2b2324a5f1edbd743bec004fe73cfef7970bead56885"}]}
// mutate4javascript-manifest-end
