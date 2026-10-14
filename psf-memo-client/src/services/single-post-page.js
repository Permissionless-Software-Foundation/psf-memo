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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-14T14:23:05.530Z","module_hash":"189f69f059c6da409f7678d26a353821a3197ecff89e6b3fbaf909d586b256ba","functions":[{"id":"func/SinglePostPage.constructor","name":"SinglePostPage.constructor","line":21,"end_line":36,"hash":"9bb9e4c08d5fb8bb15e6f0e4a8b02851e8a2a690658ddb35e58dabf9876c0531"},{"id":"func/SinglePostPage.threadPath","name":"SinglePostPage.threadPath","line":39,"end_line":41,"hash":"07e5e3f240ea19471f55af2f4f345bff21c8050596d22905d504b49de3c4a355"},{"id":"func/SinglePostPage.postPageUrl","name":"SinglePostPage.postPageUrl","line":44,"end_line":46,"hash":"65cf907bca050b2cae217503502456b7734581912df7aa8aeb054e58db3880e9"},{"id":"func/SinglePostPage.load","name":"SinglePostPage.load","line":50,"end_line":78,"hash":"ff93aa4050c189b3f02ec5d74d71d2b392217b1486cdd55b84d90c658eaaaa80"},{"id":"func/SinglePostPage._reset","name":"SinglePostPage._reset","line":80,"end_line":90,"hash":"c415f8bdf0fefac4574b8b3831dfb8c07965e6ce4102fccd8e509bc1c2ac83e7"},{"id":"func/SinglePostPage.getPost","name":"SinglePostPage.getPost","line":93,"end_line":96,"hash":"2a0b60b3b65dfe0281de8b6ba499df4328e9176a4d0d1eacdbd638fbd4ad5b4e"},{"id":"func/SinglePostPage.visibleReplies","name":"SinglePostPage.visibleReplies","line":99,"end_line":101,"hash":"cc86dfc4b9a57f598d765b4044b858513d69bd91a3d9866bf61df31b762ef405"},{"id":"func/SinglePostPage.canLoadMoreReplies","name":"SinglePostPage.canLoadMoreReplies","line":104,"end_line":106,"hash":"971014d53431a933fe9182dbbf5c6d0ae92c3d3e748d9b700f188a00c995b42b"},{"id":"func/SinglePostPage.loadMoreReplies","name":"SinglePostPage.loadMoreReplies","line":109,"end_line":112,"hash":"8b6543845fac27d0056d8606616b44a4f45e5ef2686323f170a88a59677c800d"},{"id":"func/SinglePostPage.showsReplyForm","name":"SinglePostPage.showsReplyForm","line":115,"end_line":117,"hash":"2ff7fca7a85688b574c1330659df22e3aefe94984d906ee86bbeffe816c6fd33"},{"id":"func/SinglePostPage.replyTargetTxid","name":"SinglePostPage.replyTargetTxid","line":121,"end_line":123,"hash":"6e70d4b36baa8ed09e05797271961206e484277dca8b92100aafb1b29649f6ff"},{"id":"func/SinglePostPage.selectReply","name":"SinglePostPage.selectReply","line":125,"end_line":128,"hash":"d02f00a11beb027de58f9bc0e0dcca10ec3beb4d5ceaa24c778df9f103c97642"},{"id":"func/SinglePostPage.clearReplyTarget","name":"SinglePostPage.clearReplyTarget","line":130,"end_line":133,"hash":"fb209f2f64683e474741eddf12e306ea488cca74592f60bebc41a676c96a5510"},{"id":"func/SinglePostPage.addReply","name":"SinglePostPage.addReply","line":136,"end_line":140,"hash":"c75e397162689757691f4b1b57500799e9d1a0e706247de588f4c0b065f5827a"},{"id":"func/SinglePostPage.copyLink","name":"SinglePostPage.copyLink","line":143,"end_line":148,"hash":"2af3bd34597e3adc54f7b4963dc18318142396a1a727e173ccd7567acb612caa"},{"id":"func/flattenReplies","name":"flattenReplies","line":153,"end_line":163,"hash":"e6544a81a60e2c46c9a347fe8dea73886084f5804a721686c1e91eee65ea9e08"}]}
// mutate4javascript-manifest-end
