/*
  Profile Page behavior: load and display a single address's Memo posts.

  This is the testable controller behind the React "Profile" page.  It wraps
  the MemoDb client, targets a specific address, and exposes the loaded posts so
  the view can render per-post data such as the like count.

  The memoDb and address concerns are injected so this module stays free of
  UI/network concerns; environmentally unsuitable I/O lives behind those small
  adapter boundaries.
*/

const PROFILE_PATH_PREFIX = '/profile'

class ProfilePage {
  constructor (deps = {}) {
    this.memoDb = deps.memoDb || null
    this.addr = deps.addr || null
    this.posts = []
    this.pagination = null
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

    return { posts: this.posts, pagination: this.pagination }
  }

  getPost (txid) {
    return this.posts.find((post) => post.txid === txid) || null
  }
}

ProfilePage.PROFILE_PATH_PREFIX = PROFILE_PATH_PREFIX

module.exports = ProfilePage
