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
