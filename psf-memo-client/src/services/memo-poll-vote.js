/*
  Memo poll-vote behavior: compose, validate, and broadcast a Memo poll-vote
  action (0x6d14).

  A poll-vote transaction carries the Memo poll-vote protocol prefix followed
  by the poll's 32-byte txid and a comment. The comment is limited to 184
  bytes.

  The wallet and an injected poll store are used so this module stays testable
  and free of UI/network concerns; environmentally unsuitable I/O lives behind
  those small adapter boundaries.

  Constants
    MEMO_POLL_VOTE_PREFIX : hex prefix for the Memo poll-vote action (0x6d14)
    MAX_COMMENT_BYTES     : maximum comment byte length (184)
    POLL_TXID_BYTES       : poll txid byte length (32)
*/

const MemoAction = require('./memo-action')
const { byteLength } = require('./utf8')
const { hexToBytes } = require('./hex')

const MEMO_POLL_VOTE_PREFIX = '6d14'
const MAX_COMMENT_BYTES = 184
const POLL_TXID_BYTES = 32

class MemoPollVote extends MemoAction {
  static config = {
    prefix: MEMO_POLL_VOTE_PREFIX,
    walletRequiredMsg: 'Memo poll vote requires a wallet.',
    lengthMessage: `Poll vote comment is too long. Maximum is ${MAX_COMMENT_BYTES} bytes.`,
    emptyMessage: 'Poll vote comment must not be empty.',
    lengthCode: 'poll_vote_length',
    validationCode: 'poll_vote_validation'
  }

  constructor (deps = {}) {
    super(deps)
    this.pollTxid = deps.pollTxid || ''
    this.polls = deps.polls || null
  }

  // A poll vote comment is over-length when its UTF-8 byte count exceeds the limit.
  isTooLong (comment) {
    return byteLength(comment) > MAX_COMMENT_BYTES
  }

  // Compose and broadcast a Memo poll-vote action.
  async vote (comment) {
    const check = this.validate(comment)
    this._throwIfInvalid(check)

    if (!this.wallet) {
      throw new Error(this.walletRequiredMsg)
    }

    if (!this.pollTxid) {
      const err = new Error('Poll txid is required.')
      err.code = 'poll_vote_validation'
      throw err
    }

    await this.wallet.getUtxos()

    const raw = buildPollVotePayload(this.pollTxid, comment)
    const txid = await this.wallet.sendOpReturn(raw, this.prefix)

    this.reflect(txid, comment)

    return txid
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

// Build the raw OP_RETURN message payload for a poll-vote action.
// The protocol wire format is: <poll txid 32 bytes><comment UTF-8 bytes>.
function buildPollVotePayload (pollTxid, comment) {
  const txidBytes = hexToBytes(pollTxid, POLL_TXID_BYTES, 'Poll txid')
  const textBytes = new TextEncoder().encode(comment)
  const raw = new Uint8Array(txidBytes.length + textBytes.length)
  raw.set(txidBytes, 0)
  raw.set(textBytes, txidBytes.length)
  return raw
}

MemoPollVote.MEMO_POLL_VOTE_PREFIX = MEMO_POLL_VOTE_PREFIX
MemoPollVote.MAX_COMMENT_BYTES = MAX_COMMENT_BYTES

module.exports = MemoPollVote
