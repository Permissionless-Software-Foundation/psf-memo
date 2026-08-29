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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T22:46:38.952Z","module_hash":"f4505b989b5fa6868f584fb729256221b7f4c8f68dbfdd21b9e1a60fc93dea49","functions":[{"id":"func/PollCreatePage.constructor","name":"PollCreatePage.constructor","line":22,"end_line":29,"hash":"7fea9e1104d00994f47b87163f114da456ef3a93d3bee4516ac9516f6f5e0dc5"},{"id":"func/PollCreatePage.setOptionCount","name":"PollCreatePage.setOptionCount","line":32,"end_line":35,"hash":"942e0826112c964545b8e198a935fec15f4664d4933e1aec0537ea3f9b03593d"},{"id":"func/PollCreatePage.remainingCount","name":"PollCreatePage.remainingCount","line":38,"end_line":43,"hash":"ce0f4da879dcc66b216f905fcc1a0141c4432f8b46ab29728de7d1c00fd22f0c"},{"id":"func/PollCreatePage._questionBytes","name":"PollCreatePage._questionBytes","line":45,"end_line":47,"hash":"37e13e5bdc13c74698809f523cd1ac5ad126efea55a747ac21ef1367e0b2834e"},{"id":"func/PollCreatePage._setBusy","name":"PollCreatePage._setBusy","line":50,"end_line":52,"hash":"bccf9e30325028d65bddeb286090bc025b5a051a77286d7b8ea1ea21a827b498"},{"id":"func/PollCreatePage._perform","name":"PollCreatePage._perform","line":55,"end_line":60,"hash":"7667bebef3299e042042c8849930966de75acffa5900082d4dccd73e01f7e4fb"}]}
// mutate4javascript-manifest-end
