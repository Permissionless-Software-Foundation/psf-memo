/*
  Single Post Page behavior: load and display one Memo post and its reply
  thread at the permalink /posts/thread/<txid>.

  This is the testable controller behind the React "Single Post" page. It wraps
  the MemoDb client, targets a specific root post txid, paginates the reply
  thread ten replies per page with a "Load more replies" control, offers a
  reply form, and copies the page permalink. Unknown txids produce the
  not-found state; a failed request surfaces the error message.

  The memoDb, wallet, and clipboard concerns are injected so this module stays
  free of UI/network concerns; environmentally unsuitable I/O lives behind
  those small adapter boundaries.
*/

const { THREAD_PATH_PREFIX, threadPath, postPageUrl } = require('./post-permalink')

const REPLY_PAGE_SIZE = 10

class SinglePostPage {
  constructor (deps = {}) {
    this.memoDb = deps.memoDb || null
    this.copyToClipboard = deps.copyToClipboard || (() => {})
    this.origin = deps.origin || ''
    this.pageSize = deps.pageSize || REPLY_PAGE_SIZE

    this.txid = null
    this.rootPost = null
    this.replies = []
    this.visibleCount = 0
    this.loaded = false
    this.notFound = false
    this.error = null
    this.linkCopied = false
    this.selectedReplyTxid = null
  }

  // Build the permalink path for a post txid.
  static threadPath (txid) {
    return threadPath(txid)
  }

  // Build the absolute permalink URL, prepending the page origin when known.
  static postPageUrl (txid, origin = '') {
    return postPageUrl(txid, origin)
  }

  // Load the thread for a root post txid. Resolves with a result object and
  // records the page state: rootPost, visible replies, not-found, or error.
  async load (txid) {
    this._reset()

    if (!this.memoDb) {
      throw new Error('Single post page requires a memo db client.')
    }

    let data
    try {
      data = await this.memoDb.getPostThread(txid)
    } catch (err) {
      this.error = err.message || String(err)
      return { ok: false, error: this.error }
    }

    const post = data?.post || null
    if (!post) {
      this.notFound = true
      return { ok: false, notFound: true }
    }

    this.txid = txid
    this.rootPost = post
    this.replies = flattenReplies(post)
    this.visibleCount = Math.min(this.pageSize, this.replies.length)
    this.loaded = true

    return { ok: true, post: this.rootPost, replies: this.visibleReplies() }
  }

  _reset () {
    this.txid = null
    this.rootPost = null
    this.replies = []
    this.visibleCount = 0
    this.loaded = false
    this.notFound = false
    this.error = null
    this.linkCopied = false
    this.selectedReplyTxid = null
  }

  // Find the root post or any reply loaded on the page.
  getPost (txid) {
    if (this.rootPost && this.rootPost.txid === txid) return this.rootPost
    return this.replies.find((reply) => reply.txid === txid) || null
  }

  // The replies currently rendered on the page.
  visibleReplies () {
    return this.replies.slice(0, this.visibleCount)
  }

  // True when more replies exist beyond the current page.
  canLoadMoreReplies () {
    return this.visibleCount < this.replies.length
  }

  // Reveal the next page of replies and return the newly visible list.
  loadMoreReplies () {
    this.visibleCount = Math.min(this.visibleCount + this.pageSize, this.replies.length)
    return this.visibleReplies()
  }

  // The reply form is available once the root post has loaded.
  showsReplyForm () {
    return this.loaded
  }

  // The txid the next reply will be attached to: the selected reply, or the
  // root post when no reply is selected.
  replyTargetTxid () {
    return this.selectedReplyTxid || this.rootPost?.txid || null
  }

  selectReply (txid) {
    this.selectedReplyTxid = txid
    return this
  }

  clearReplyTarget () {
    this.selectedReplyTxid = null
    return this
  }

  // Append a just-broadcast reply and reveal it on the page.
  addReply (reply) {
    this.replies.push(reply)
    this.visibleCount = Math.min(this.replies.length, this.visibleCount + 1)
    return reply
  }

  // Copy the page permalink and show the confirmation.
  async copyLink () {
    const url = SinglePostPage.postPageUrl(this.txid, this.origin)
    await this.copyToClipboard(url)
    this.linkCopied = true
    return url
  }
}

// Flatten a reply tree into oldest-first display order, keeping each reply
// immediately before its own nested replies.
function flattenReplies (post) {
  const flat = []
  const visit = (node) => {
    for (const reply of node.replies || []) {
      flat.push(reply)
      visit(reply)
    }
  }
  visit(post)
  return flat
}

SinglePostPage.THREAD_PATH_PREFIX = THREAD_PATH_PREFIX
SinglePostPage.REPLY_PAGE_SIZE = REPLY_PAGE_SIZE

module.exports = SinglePostPage
