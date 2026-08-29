/*
  Shared base for page controllers that submit a single-text Memo action
  against a parent poll (e.g. add a poll option or cast a poll vote), with a
  byte counter that counts down from the field's limit.

  Such a page holds the current input, computes the remaining byte budget,
  validates/broadcasts through an injected action handler, and surfaces the
  result through the shared PageController flow (no navigation on success).

  Subclasses supply a static config:
    handlerKey       - deps key holding the action handler
    busyKey          - instance key for the in-flight flag
    actionMethod     - handler method to invoke for the current input
    requiresMsg      - error message when no handler is injected
    maxBytes         - the field's byte limit
    validationCodes  - error codes for local validation failures

  The handler and navigate concerns are injected so this module stays free of
  UI/network concerns; environmentally unsuitable I/O lives behind those small
  adapter boundaries.
*/

const PageController = require('./page-controller')
const { byteLength } = require('./utf8')

class PollActionPage extends PageController {
  constructor (deps = {}) {
    super(deps)
    const cfg = this.constructor.config
    this[cfg.handlerKey] = deps[cfg.handlerKey] || null
    this[cfg.busyKey] = false
    this.validationCodes = cfg.validationCodes
  }

  // Bytes remaining before the field's limit is reached.
  remainingCount () {
    return this.constructor.config.maxBytes - byteLength(this.input)
  }

  // Set the in-flight flag.
  _setBusy (value) {
    this[this.constructor.config.busyKey] = value
  }

  // Run the action handler for the current input.
  async _perform (input) {
    const cfg = this.constructor.config
    if (!this[cfg.handlerKey]) {
      throw new Error(cfg.requiresMsg)
    }
    return this[cfg.handlerKey][cfg.actionMethod](input)
  }
}

module.exports = PollActionPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T22:46:20.654Z","module_hash":"424696b48899d06ade5386ec5be3588c6b1ea1a30fe8ce9ed43a3636ff446d68","functions":[{"id":"func/PollActionPage.constructor","name":"PollActionPage.constructor","line":27,"end_line":33,"hash":"4b6202ed9803158cf5b646f3e48635ad318c50adb503b13a7e6d8c01b1e95fea"},{"id":"func/PollActionPage.remainingCount","name":"PollActionPage.remainingCount","line":36,"end_line":38,"hash":"99ebb2601bf4ecfc6d9fcfe03a4ffcb3ec2dc7174a12ee668ce35e44083df96d"},{"id":"func/PollActionPage._setBusy","name":"PollActionPage._setBusy","line":41,"end_line":43,"hash":"b25ece6baf7159cdfbb0ddcd435617965f884d0541108f9e2d677a1e65cba970"},{"id":"func/PollActionPage._perform","name":"PollActionPage._perform","line":46,"end_line":52,"hash":"b16fe867f293e1aa356a38484a912d112e90157cb7d74966facf6b59861c1495"}]}
// mutate4javascript-manifest-end
