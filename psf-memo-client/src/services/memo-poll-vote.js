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
const { buildTxidTextPayload } = require('./hex')

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
    return this.broadcastTxid(comment, buildTxidTextPayload)
  }
}

MemoPollVote.MEMO_POLL_VOTE_PREFIX = MEMO_POLL_VOTE_PREFIX
MemoPollVote.MAX_COMMENT_BYTES = MAX_COMMENT_BYTES

module.exports = MemoPollVote

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T23:38:23.086Z","module_hash":"c60989293dede6eeaf8edd168d00745e7299620b80874f87680337cc2f4d36fc","functions":[{"id":"func/MemoPollVote.vote","name":"MemoPollVote.vote","line":37,"end_line":39,"hash":"c6c194dfaf6c92f5cafcf86772bd295d038536ea20079931e4144eb5141c7101"}]}
// mutate4javascript-manifest-end
