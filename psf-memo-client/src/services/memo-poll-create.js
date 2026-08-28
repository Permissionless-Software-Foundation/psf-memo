/*
  Memo create-poll behavior: compose, validate, and broadcast a Memo create-poll
  action (0x6d10).

  A create-poll transaction carries the Memo create-poll protocol prefix
  followed by a poll_type byte, an option_count byte, and the question text.
  The question is limited to 209 bytes.

  The wallet and an injected poll store are used so this module stays testable
  and free of UI/network concerns; environmentally unsuitable I/O lives behind
  those small adapter boundaries.

  Constants
    MEMO_CREATE_POLL_PREFIX : hex prefix for the Memo create-poll action (0x6d10)
    MAX_QUESTION_BYTES      : maximum question byte length (209)
    DEFAULT_POLL_TYPE       : default poll type byte (1)
*/

const MemoAction = require('./memo-action')
const { byteLength } = require('./utf8')

const MEMO_CREATE_POLL_PREFIX = '6d10'
const MAX_QUESTION_BYTES = 209
const DEFAULT_POLL_TYPE = 1

class MemoPollCreate extends MemoAction {
  static config = {
    prefix: MEMO_CREATE_POLL_PREFIX,
    walletRequiredMsg: 'Memo poll create requires a wallet.',
    lengthMessage: `Poll question is too long. Maximum is ${MAX_QUESTION_BYTES} bytes.`,
    emptyMessage: 'Poll question must not be empty.',
    lengthCode: 'poll_create_length',
    validationCode: 'poll_create_validation'
  }

  constructor (deps = {}) {
    super(deps)
    this.pollType = deps.pollType ?? DEFAULT_POLL_TYPE
    this.polls = deps.polls || null
  }

  // A poll question is over-length when its UTF-8 byte count exceeds the limit.
  isTooLong (question) {
    return byteLength(question) > MAX_QUESTION_BYTES
  }

  // Compose and broadcast a Memo create-poll action.
  async create (question, optionCount) {
    const check = this.validate(question)
    this._throwIfInvalid(check)

    const count = parseInt(optionCount, 10)
    if (Number.isNaN(count) || count < 1) {
      const err = new Error('Poll option count must be a positive number.')
      err.code = 'poll_create_validation'
      throw err
    }

    if (!this.wallet) {
      throw new Error(this.walletRequiredMsg)
    }

    await this.wallet.getUtxos()

    const raw = buildCreatePollPayload(question, this.pollType, count)
    const txid = await this.wallet.sendOpReturn(raw, this.prefix)

    this.reflect(txid, question, count)

    return txid
  }

  // Record the new poll on the injected poll store when one is present.
  reflect (txid, question, optionCount) {
    if (this.polls && typeof this.polls.addPoll === 'function') {
      this.polls.addPoll({
        txid,
        address: this.wallet.walletInfo.cashAddress,
        question,
        optionCount,
        pollType: this.pollType
      })
    }
  }
}

// Build the raw OP_RETURN message payload for a create-poll action.
// The protocol wire format is: <poll_type 1 byte><option_count 1 byte><question UTF-8 bytes>.
function buildCreatePollPayload (question, pollType, optionCount) {
  const textBytes = new TextEncoder().encode(question)
  const raw = new Uint8Array(2 + textBytes.length)
  raw[0] = pollType & 0xff
  raw[1] = optionCount & 0xff
  raw.set(textBytes, 2)
  return raw
}

MemoPollCreate.MEMO_CREATE_POLL_PREFIX = MEMO_CREATE_POLL_PREFIX
MemoPollCreate.MAX_QUESTION_BYTES = MAX_QUESTION_BYTES
MemoPollCreate.DEFAULT_POLL_TYPE = DEFAULT_POLL_TYPE

module.exports = MemoPollCreate
