/*
  Memo add-poll-option behavior: compose, validate, and broadcast a Memo
  add-poll-option action (0x6d13).

  An add-poll-option transaction carries the Memo add-poll-option protocol
  prefix followed by the poll's 32-byte txid and the option text. The option
  text is limited to 184 bytes.

  The wallet and an injected poll store are used so this module stays testable
  and free of UI/network concerns; environmentally unsuitable I/O lives behind
  those small adapter boundaries.

  Constants
    MEMO_ADD_POLL_OPTION_PREFIX : hex prefix for the Memo add-poll-option action (0x6d13)
    MAX_OPTION_BYTES            : maximum option byte length (184)
    POLL_TXID_BYTES             : poll txid byte length (32)
*/

const MemoAction = require('./memo-action')
const { byteLength } = require('./utf8')
const { hexToBytes } = require('./hex')

const MEMO_ADD_POLL_OPTION_PREFIX = '6d13'
const MAX_OPTION_BYTES = 184
const POLL_TXID_BYTES = 32

class MemoPollOption extends MemoAction {
  static config = {
    prefix: MEMO_ADD_POLL_OPTION_PREFIX,
    walletRequiredMsg: 'Memo poll option requires a wallet.',
    lengthMessage: `Poll option is too long. Maximum is ${MAX_OPTION_BYTES} bytes.`,
    emptyMessage: 'Poll option must not be empty.',
    lengthCode: 'poll_option_length',
    validationCode: 'poll_option_validation'
  }

  constructor (deps = {}) {
    super(deps)
    this.pollTxid = deps.pollTxid || ''
    this.polls = deps.polls || null
  }

  // A poll option is over-length when its UTF-8 byte count exceeds the limit.
  isTooLong (option) {
    return byteLength(option) > MAX_OPTION_BYTES
  }

  // Compose and broadcast a Memo add-poll-option action.
  async add (option) {
    const check = this.validate(option)
    this._throwIfInvalid(check)

    if (!this.wallet) {
      throw new Error(this.walletRequiredMsg)
    }

    if (!this.pollTxid) {
      const err = new Error('Poll txid is required.')
      err.code = 'poll_option_validation'
      throw err
    }

    await this.wallet.getUtxos()

    const raw = buildAddPollOptionPayload(this.pollTxid, option)
    const txid = await this.wallet.sendOpReturn(raw, this.prefix)

    this.reflect(txid, option)

    return txid
  }

  // Record the new option on the injected poll store when one is present.
  reflect (txid, option) {
    if (this.polls && typeof this.polls.addOption === 'function') {
      this.polls.addOption({
        txid,
        pollTxid: this.pollTxid,
        address: this.wallet.walletInfo.cashAddress,
        option
      })
    }
  }
}

// Build the raw OP_RETURN message payload for an add-poll-option action.
// The protocol wire format is: <poll txid 32 bytes><option UTF-8 bytes>.
function buildAddPollOptionPayload (pollTxid, option) {
  const txidBytes = hexToBytes(pollTxid, POLL_TXID_BYTES, 'Poll txid')
  const textBytes = new TextEncoder().encode(option)
  const raw = new Uint8Array(txidBytes.length + textBytes.length)
  raw.set(txidBytes, 0)
  raw.set(textBytes, txidBytes.length)
  return raw
}

MemoPollOption.MEMO_ADD_POLL_OPTION_PREFIX = MEMO_ADD_POLL_OPTION_PREFIX
MemoPollOption.MAX_OPTION_BYTES = MAX_OPTION_BYTES

module.exports = MemoPollOption
