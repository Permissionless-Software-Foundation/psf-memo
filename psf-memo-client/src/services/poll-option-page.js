/*
  Poll Option Page behavior: compose and broadcast a Memo add-poll-option
  action, with a byte counter that counts down from the option limit.

  This is the testable controller behind the React poll option composer. It
  wraps the Memo poll-option behavior (src/services/memo-poll-option.js)
  through the shared PollActionPage base.

  The memoPollOption and navigate concerns are injected so this module stays
  free of UI/network concerns; environmentally unsuitable I/O lives behind
  those small adapter boundaries.
*/

const PollActionPage = require('./poll-action-page')
const MemoPollOption = require('./memo-poll-option')

class PollOptionPage extends PollActionPage {
  static config = {
    handlerKey: 'memoPollOption',
    busyKey: 'adding',
    actionMethod: 'add',
    requiresMsg: 'Poll option page requires a memo poll option handler.',
    maxBytes: MemoPollOption.MAX_OPTION_BYTES,
    validationCodes: ['poll_option_validation', 'poll_option_length']
  }
}

PollOptionPage.MAX_OPTION_BYTES = MemoPollOption.MAX_OPTION_BYTES

module.exports = PollOptionPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T22:42:16.020Z","module_hash":"a48cec069109b655b4ab5749c6dd7da46dbf5962a88da04e6b96db94df68fa4a","functions":[]}
// mutate4javascript-manifest-end
