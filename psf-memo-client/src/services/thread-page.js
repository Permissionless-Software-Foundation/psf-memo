/*
  Thread Page behavior: load and display a post and its nested replies.

  This is the testable controller behind the React "Post Thread" modal.  It
  wraps the MemoDb client, targets a specific root post txid, and exposes the
  loaded posts so the view can render per-post data such as the like count.

  The memoDb concern is injected so this module stays free of UI/network
  concerns; environmentally unsuitable I/O lives behind that small adapter
  boundary.
*/

const THREAD_PATH_PREFIX = '/posts/thread'

class ThreadPage {
  constructor (deps = {}) {
    this.memoDb = deps.memoDb || null
    this.rootPost = null
    this.allPosts = []
  }

  async load (txid) {
    if (!this.memoDb) {
      throw new Error('Thread page requires a memo db client.')
    }

    const data = await this.memoDb.getPostThread(txid)
    this.rootPost = data.post || null
    this.allPosts = []
    if (this.rootPost) {
      this._flatten(this.rootPost)
    }

    return { post: this.rootPost, allPosts: this.allPosts }
  }

  getPost (txid) {
    return this.allPosts.find((post) => post.txid === txid) || null
  }

  _flatten (post) {
    this.allPosts.push(post)
    for (const reply of post.replies || []) {
      this._flatten(reply)
    }
  }
}

ThreadPage.THREAD_PATH_PREFIX = THREAD_PATH_PREFIX

module.exports = ThreadPage
