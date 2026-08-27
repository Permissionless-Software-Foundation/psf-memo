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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T03:37:28.366Z","module_hash":"72c6d473102b96ef23e3febd49bde31801b4c847ec1d08aeeff26e6efbae025a","functions":[{"id":"func/ThreadPage.constructor","name":"ThreadPage.constructor","line":16,"end_line":20,"hash":"991bc60db7889f60ab1d0b129c8f588ce964ea3dc8e71d44abb8bdc8452dd0b7"},{"id":"func/ThreadPage.load","name":"ThreadPage.load","line":22,"end_line":35,"hash":"4ee1a6881f170ef49c104e4135b41fbfd381de913d801e48d4d3ea2df1fd6113"},{"id":"func/ThreadPage.getPost","name":"ThreadPage.getPost","line":37,"end_line":39,"hash":"316894eedc9fc002bae913451ba8c304bc587dca44c1769b3af377a9084c5e28"},{"id":"func/ThreadPage._flatten","name":"ThreadPage._flatten","line":41,"end_line":46,"hash":"e4cedb80dd8392fd846f575112162f9b5ca3d6ee6749f775704b48e265045b8a"}]}
// mutate4javascript-manifest-end
