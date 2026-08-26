/*
  Reply Thread Page behavior: compose and submit a reply inside a thread
  modal, with a live byte counter that counts down from the reply limit.

  This is the testable controller behind the Reply form in the React thread
  modal. It wraps the Memo reply behavior (src/services/memo-reply.js) and
  adds page-level concerns: holding the current input, tracking the parent txid
  being replied to, computing the remaining byte count, and surfacing
  validation/length/broadcast errors.

  The memoReply and navigate concerns are injected so this module stays free of
  UI/network concerns; environmentally unsuitable I/O lives behind those small
  adapter boundaries.
*/

const PageController = require('./page-controller')
const MemoReply = require('./memo-reply')
const { byteLength } = require('./utf8')

const REPLY_THREAD_PATH = '/posts/thread'

class ReplyThreadPage extends PageController {
  constructor (deps = {}) {
    super(deps)
    this.memoReply = deps.memoReply || null
    this.replying = false
    this.successPath = deps.successPath || null
    this.validationCodes = ['reply_validation', 'reply_length']
    this.parentTxid = deps.parentTxid || null
  }

  // Set the parent txid that the next reply will be attached to.
  setParent (txid) {
    this.parentTxid = txid
    return this
  }

  // Bytes remaining before the reply byte limit is reached.
  remainingCount () {
    return MemoReply.MAX_REPLY_BYTES - byteLength(this.input)
  }

  // Set the in-flight replying flag.
  _setBusy (value) {
    this.replying = value
  }

  // Run the memo reply action for the current input against the current parent.
  async _perform (input) {
    if (!this.memoReply) {
      throw new Error('Reply thread requires a memo reply handler.')
    }
    return this.memoReply.reply(input, this.parentTxid)
  }
}

ReplyThreadPage.REPLY_THREAD_PATH = REPLY_THREAD_PATH

module.exports = ReplyThreadPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T12:18:23.318Z","module_hash":"6a5e24347eb65fe6f046276efeeab797895317e58ac9803800bf3eef5ddbcf90","functions":[{"id":"func/ReplyThreadPage.constructor","name":"ReplyThreadPage.constructor","line":23,"end_line":30,"hash":"b43af0c6321c8f04814d27e71ad868636921162142917594e8a9235cd7b9c926"},{"id":"func/ReplyThreadPage.setParent","name":"ReplyThreadPage.setParent","line":33,"end_line":36,"hash":"2816f5ec8d3c78101df88e2121f42d89007f3a4153f08990dc9b13c40f75d317"},{"id":"func/ReplyThreadPage.remainingCount","name":"ReplyThreadPage.remainingCount","line":39,"end_line":41,"hash":"2e6661f11eb38ed153282f6ff9d2ba0d7bd6123b4e98a5f9a68bef2da13f301c"},{"id":"func/ReplyThreadPage._setBusy","name":"ReplyThreadPage._setBusy","line":44,"end_line":46,"hash":"eab587885393bc07c55e5c7e73fdd200eac659176c2d8dcf60b8e35773a3a6cf"},{"id":"func/ReplyThreadPage._perform","name":"ReplyThreadPage._perform","line":49,"end_line":54,"hash":"640864465ca82bdc624c93b695f8da359ef19d4001e94e1432328fe3486fd14c"}]}
// mutate4javascript-manifest-end
