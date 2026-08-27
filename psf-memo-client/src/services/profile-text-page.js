/*
  Shared base for page controllers that set a Memo profile text field (e.g. a
  display name or a bio).

  A profile text page holds the current input, counts down the remaining byte
  budget, validates/broadcasts through an injected action handler, and
  navigates to the account page on success.

  Subclasses supply a static config:
    handlerKey       - deps key holding the action handler
    busyKey          - instance key for the in-flight flag
    actionMethod     - handler method to invoke for the current input
    requiresMsg      - error message when no handler is injected
    maxBytes         - the profile text field's byte limit
    validationCodes  - error codes for local validation failures

  The handler and navigate concerns are injected so this module stays free of
  UI/network concerns; environmentally unsuitable I/O lives behind those small
  adapter boundaries.
*/

const PageController = require('./page-controller')
const { byteLength } = require('./utf8')

const ACCOUNT_PATH = '/account'

class ProfileTextPage extends PageController {
  constructor (deps = {}) {
    super(deps)
    const cfg = this.constructor.config
    this[cfg.handlerKey] = deps[cfg.handlerKey] || null
    this[cfg.busyKey] = false
    this.successPath = ACCOUNT_PATH
    this.validationCodes = cfg.validationCodes
  }

  // Bytes remaining before the profile text limit is reached.
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

ProfileTextPage.ACCOUNT_PATH = ACCOUNT_PATH

module.exports = ProfileTextPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T15:05:32.147Z","module_hash":"d06e97cbcfa2f5fc4b9bc481d8e3520536eb7e7ed8fe35daeedbda55bd243849","functions":[{"id":"func/ProfileTextPage.constructor","name":"ProfileTextPage.constructor","line":28,"end_line":35,"hash":"cc7d5bf86f1fcc5e71acb91ee96d75dd89110c4ff84e7ca3fec57be107a9cc70"},{"id":"func/ProfileTextPage.remainingCount","name":"ProfileTextPage.remainingCount","line":38,"end_line":40,"hash":"99ebb2601bf4ecfc6d9fcfe03a4ffcb3ec2dc7174a12ee668ce35e44083df96d"},{"id":"func/ProfileTextPage._setBusy","name":"ProfileTextPage._setBusy","line":43,"end_line":45,"hash":"b25ece6baf7159cdfbb0ddcd435617965f884d0541108f9e2d677a1e65cba970"},{"id":"func/ProfileTextPage._perform","name":"ProfileTextPage._perform","line":48,"end_line":54,"hash":"b16fe867f293e1aa356a38484a912d112e90157cb7d74966facf6b59861c1495"}]}
// mutate4javascript-manifest-end
