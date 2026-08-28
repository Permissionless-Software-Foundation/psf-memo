/*
  Poll Create Page behavior: compose and broadcast a Memo create-poll action,
  with a byte counter that counts down from the question limit.

  This is the testable controller behind the React poll composer. It wraps
  the Memo poll-create behavior (src/services/memo-poll-create.js) and adds
  page-level concerns: holding the current question and option count,
  computing the remaining byte count, surfacing validation/length errors, and
  navigating on success.

  The memoPollCreate and navigate concerns are injected so this module stays
  free of UI/network concerns; environmentally unsuitable I/O lives behind
  those small adapter boundaries.
*/

const PageController = require('./page-controller')
const MemoPollCreate = require('./memo-poll-create')

const RECENT_FEED_PATH = '/posts/recent'

class PollCreatePage extends PageController {
  constructor (deps = {}) {
    super(deps)
    this.memoPollCreate = deps.memoPollCreate || null
    this.optionCount = 2
    this.creating = false
    this.successPath = RECENT_FEED_PATH
    this.validationCodes = ['poll_create_validation', 'poll_create_length']
  }

  // Set the option count.
  setOptionCount (count) {
    this.optionCount = parseInt(count, 10)
    return this
  }

  // Bytes remaining for the question.
  remainingCount () {
    if (!this.memoPollCreate) {
      throw new Error('Poll create page requires a memo poll create handler.')
    }
    return MemoPollCreate.MAX_QUESTION_BYTES - this._questionBytes()
  }

  _questionBytes () {
    return new TextEncoder().encode(this.input).length
  }

  // Set the in-flight flag.
  _setBusy (value) {
    this.creating = value
  }

  // Run the memo poll create action for the current input.
  async _perform (input) {
    if (!this.memoPollCreate) {
      throw new Error('Poll create page requires a memo poll create handler.')
    }
    return this.memoPollCreate.create(input, this.optionCount)
  }
}

PollCreatePage.MAX_QUESTION_BYTES = MemoPollCreate.MAX_QUESTION_BYTES
PollCreatePage.RECENT_FEED_PATH = RECENT_FEED_PATH

module.exports = PollCreatePage
