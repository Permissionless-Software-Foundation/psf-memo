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
