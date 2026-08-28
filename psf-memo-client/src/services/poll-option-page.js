/*
  Poll Option Page behavior: compose and broadcast a Memo add-poll-option
  action, with a byte counter that counts down from the option limit.

  This is the testable controller behind the React poll option composer. It
  wraps the Memo poll-option behavior (src/services/memo-poll-option.js).

  The memoPollOption and navigate concerns are injected so this module stays
  free of UI/network concerns; environmentally unsuitable I/O lives behind
  those small adapter boundaries.
*/

const PageController = require('./page-controller')
const MemoPollOption = require('./memo-poll-option')

class PollOptionPage extends PageController {
  constructor (deps = {}) {
    super(deps)
    this.memoPollOption = deps.memoPollOption || null
    this.adding = false
    this.validationCodes = ['poll_option_validation', 'poll_option_length']
  }

  // Bytes remaining for the option text.
  remainingCount () {
    if (!this.memoPollOption) {
      throw new Error('Poll option page requires a memo poll option handler.')
    }
    return MemoPollOption.MAX_OPTION_BYTES - this._optionBytes()
  }

  _optionBytes () {
    return new TextEncoder().encode(this.input).length
  }

  // Set the in-flight flag.
  _setBusy (value) {
    this.adding = value
  }

  // Run the memo poll option action for the current input.
  async _perform (input) {
    if (!this.memoPollOption) {
      throw new Error('Poll option page requires a memo poll option handler.')
    }
    return this.memoPollOption.add(input)
  }
}

PollOptionPage.MAX_OPTION_BYTES = MemoPollOption.MAX_OPTION_BYTES

module.exports = PollOptionPage
