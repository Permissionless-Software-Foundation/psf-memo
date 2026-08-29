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
    validationCode: 'poll_option_validation',
    reflectMethod: 'addOption',
    valueField: 'option',
    maxBytes: MAX_OPTION_BYTES
  }

  // Compose and broadcast a Memo add-poll-option action.
  add (option) {
    return this.broadcastTxid(option, buildTxidTextPayload)
  }
}

MemoPollOption.MEMO_ADD_POLL_OPTION_PREFIX = MEMO_ADD_POLL_OPTION_PREFIX
MemoPollOption.MAX_OPTION_BYTES = MAX_OPTION_BYTES

module.exports = MemoPollOption

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T23:38:02.285Z","module_hash":"f8432d9ccb0073f5cce9f96415fdfb033876f498a7d80aadaca1ed96d89d4ce3","functions":[{"id":"func/MemoPollOption.add","name":"MemoPollOption.add","line":37,"end_line":39,"hash":"e0343ddce138d48e3fec2c5c0169e9d99f374835cc95d381383a254297d7f1dc"}]}
// mutate4javascript-manifest-end
