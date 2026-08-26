/*
  Memo post behavior: compose, validate, and broadcast a Memo "post" message.

  A Memo post is an OP_RETURN Bitcoin Cash transaction carrying the Memo post
  protocol prefix (0x6d02) followed by the message text. Broadcasting is done
  through a wallet that exposes the minimal-slp-wallet adapter surface
  (walletInfo, getUtxos(), sendOpReturn()).

  The wallet and feed are injected so this module stays testable and free of
  network/UI concerns; environmentally unsuitable I/O lives behind those small
  adapter boundaries.

  Constants
    MEMO_POST_PREFIX : hex prefix for the Memo "post" action (0x6d02)
    MAX_MEMO_CHARS   : maximum allowed memo length (spec boundary: 217 valid,
                       218 rejected)
*/

const MemoAction = require('./memo-action')

const MEMO_POST_PREFIX = '6d02'
const MAX_MEMO_CHARS = 217

class MemoPost extends MemoAction {
  static config = {
    prefix: MEMO_POST_PREFIX,
    walletRequiredMsg: 'Memo post requires a wallet.',
    lengthMessage: `Memo is too long. Maximum is ${MAX_MEMO_CHARS} characters.`,
    emptyMessage: 'Memo must not be empty.',
    lengthCode: 'memo_length',
    validationCode: 'memo_validation'
  }

  constructor (deps = {}) {
    super(deps)
    this.feed = deps.feed
  }

  // A memo is over-length when it exceeds the character limit.
  isTooLong (message) {
    return message.length > MAX_MEMO_CHARS
  }

  // Compose and broadcast a Memo post for the given message.
  // Resolves with the transaction id, or rejects with a typed error.
  async post (message) {
    return this.broadcast(message)
  }

  // Record the new post on the injected feed when one is present.
  reflect (txid, message) {
    if (this.feed && typeof this.feed.addPost === 'function') {
      this.feed.addPost({
        txid,
        address: this.wallet.walletInfo.cashAddress,
        text: message
      })
    }
  }
}

MemoPost.MEMO_POST_PREFIX = MEMO_POST_PREFIX
MemoPost.MAX_MEMO_CHARS = MAX_MEMO_CHARS

module.exports = MemoPost

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T12:18:29.322Z","module_hash":"ef34e1b3318b764dab099f693855e5f57704d60b2173e99c146bdbf34b6dd8c5","functions":[{"id":"func/MemoPost.constructor","name":"MemoPost.constructor","line":34,"end_line":37,"hash":"527e19b059e463a67be214a5c77c0ce4261ffadb58b9546b422be543c1df292d"},{"id":"func/MemoPost.isTooLong","name":"MemoPost.isTooLong","line":40,"end_line":42,"hash":"833f9f66eae849df0248d0c696c95c767a121b394b1c728bc3ec675668dff5de"},{"id":"func/MemoPost.post","name":"MemoPost.post","line":46,"end_line":48,"hash":"26d8e84b520fae1928f7f72215e6ed95f7219c14266c99b710e2af5373cb6faf"},{"id":"func/MemoPost.reflect","name":"MemoPost.reflect","line":51,"end_line":59,"hash":"87e2168a71309a572c60b63f382dd6f681cb28ed543090dbde399e29556cfcdf"}]}
// mutate4javascript-manifest-end
