/*
  Memo add-poll-option behavior: compose, validate, and broadcast a Memo
  add-poll-option action (0x6d13).

  An add-poll-option transaction carries the Memo add-poll-option protocol
  prefix followed by the poll's 32-byte txid and the option text. The option
  text is limited to 184 bytes.

  It shares the txid-embedding broadcast flow with MemoTxidAction and builds
  its wire payload from the shared txid+text helper.

  Constants
    MEMO_ADD_POLL_OPTION_PREFIX : hex prefix for the Memo add-poll-option action (0x6d13)
    MAX_OPTION_BYTES            : maximum option byte length (184)
*/

const MemoTxidAction = require('./memo-txid-action')
const { byteLength } = require('./utf8')
const { buildTxidTextPayload } = require('./hex')

const MEMO_ADD_POLL_OPTION_PREFIX = '6d13'
const MAX_OPTION_BYTES = 184

class MemoPollOption extends MemoTxidAction {
  static config = {
    prefix: MEMO_ADD_POLL_OPTION_PREFIX,
    walletRequiredMsg: 'Memo poll option requires a wallet.',
    lengthMessage: `Poll option is too long. Maximum is ${MAX_OPTION_BYTES} bytes.`,
    emptyMessage: 'Poll option must not be empty.',
    lengthCode: 'poll_option_length',
    validationCode: 'poll_option_validation'
  }

  // A poll option is over-length when its UTF-8 byte count exceeds the limit.
  isTooLong (option) {
    return byteLength(option) > MAX_OPTION_BYTES
  }

  // Compose and broadcast a Memo add-poll-option action.
  add (option) {
    return this.broadcastTxid(option, buildTxidTextPayload)
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

MemoPollOption.MEMO_ADD_POLL_OPTION_PREFIX = MEMO_ADD_POLL_OPTION_PREFIX
MemoPollOption.MAX_OPTION_BYTES = MAX_OPTION_BYTES

module.exports = MemoPollOption
