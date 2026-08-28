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
const { byteLength } = require('./utf8')
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
    validationCode: 'poll_vote_validation'
  }

  // A poll vote comment is over-length when its UTF-8 byte count exceeds the limit.
  isTooLong (comment) {
    return byteLength(comment) > MAX_COMMENT_BYTES
  }

  // Compose and broadcast a Memo poll-vote action.
  vote (comment) {
    return this.broadcastTxid(comment, buildTxidTextPayload)
  }

  // Record the new vote on the injected poll store when one is present.
  reflect (txid, comment) {
    if (this.polls && typeof this.polls.addVote === 'function') {
      this.polls.addVote({
        txid,
        pollTxid: this.pollTxid,
        address: this.wallet.walletInfo.cashAddress,
        comment
      })
    }
  }
}

MemoPollVote.MEMO_POLL_VOTE_PREFIX = MEMO_POLL_VOTE_PREFIX
MemoPollVote.MAX_COMMENT_BYTES = MAX_COMMENT_BYTES

module.exports = MemoPollVote
