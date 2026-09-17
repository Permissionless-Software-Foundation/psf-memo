/*
  Memo poll-vote behavior: compose, validate, and broadcast a Memo poll-vote
  action (0x6d14).

  A poll-vote transaction carries the Memo poll-vote protocol prefix followed
  by the poll's 32-byte txid and a comment. The comment is limited to 184
  bytes.

  It shares the txid-embedding broadcast flow with MemoTxidAction and builds
  its wire payload from the shared txid+text helper.

  Constants
    MEMO_POLL_VOTE_PREFIX : hex prefix for the Memo poll-vote action (0x6d14)
    MAX_COMMENT_BYTES     : maximum comment byte length (184)
*/

const MemoTxidAction = require('./memo-txid-action')
const { buildTxidTextPushes } = require('./hex')

const MEMO_POLL_VOTE_PREFIX = '6d14'
const MAX_COMMENT_BYTES = 184

class MemoPollVote extends MemoTxidAction {
  static config = {
    prefix: MEMO_POLL_VOTE_PREFIX,
    walletRequiredMsg: 'Memo poll vote requires a wallet.',
    lengthMessage: `Poll vote comment is too long. Maximum is ${MAX_COMMENT_BYTES} bytes.`,
    emptyMessage: 'Poll vote comment must not be empty.',
    lengthCode: 'poll_vote_length',
    validationCode: 'poll_vote_validation',
    reflectMethod: 'addVote',
    valueField: 'comment',
    maxBytes: MAX_COMMENT_BYTES
  }

  // Compose and broadcast a Memo poll-vote action.
  vote (comment) {
    return this.broadcastTxid(comment, buildTxidTextPushes)
  }
}

MemoPollVote.MEMO_POLL_VOTE_PREFIX = MEMO_POLL_VOTE_PREFIX
MemoPollVote.MAX_COMMENT_BYTES = MAX_COMMENT_BYTES

module.exports = MemoPollVote

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-17T04:17:10.193Z","module_hash":"e03a12dfad981e8a9ce4d4af763f0c57bd7a0f70a8bf22adc4b83d539b4e4725","functions":[{"id":"func/MemoPollVote.vote","name":"MemoPollVote.vote","line":37,"end_line":39,"hash":"e7ec8ae8f66c762cd7bb9fd9bb3001fe2a1b63843933d57372d6fd6f6a87b3dc"}]}
// mutate4javascript-manifest-end
