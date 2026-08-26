/*
  Shared base for page controllers that compose and submit a single action,
  surface validation/broadcast errors, and navigate on success.

  Subclasses supply the page-specific pieces:
    successPath      - path to navigate to on success
    validationCodes  - error codes that represent local validation failures
    _setBusy(value)  - set the page's in-flight flag
    _perform(input)  - run the action for the current input, resolving with txid
*/

class PageController {
  constructor (deps = {}) {
    this.navigate = deps.navigate || (() => {})
    this.input = ''
    this.submitError = null
    this.broadcastError = null
  }

  // Set the draft input.
  setInput (text) {
    this.input = typeof text === 'string' ? text : ''
    return this
  }

  // Validate and submit the current input. On success, navigate to the success
  // path. On failure, record the typed error and stay on the page. Resolves
  // with a result object.
  async submit () {
    this._setBusy(true)
    this.submitError = null
    this.broadcastError = null

    try {
      const txid = await this._perform(this.input)
      if (this.successPath) {
        this.navigate(this.successPath)
      }
      this._setBusy(false)
      return { ok: true, txid }
    } catch (err) {
      return this._handleSubmitFailure(err)
    }
  }

  // Classify a submit failure, record the typed state, and return the failure
  // result. Local validation failures set submitError; broadcast or handler
  // failures surface the real error message via broadcastError.
  _handleSubmitFailure (err) {
    if (this.validationCodes.includes(err.code)) {
      this.submitError = err.code
    } else {
      this.broadcastError = err.message || String(err)
      this.submitError = 'broadcast'
    }
    this._setBusy(false)
    return { ok: false, error: this.submitError, message: this.broadcastError }
  }
}

module.exports = PageController

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T12:18:35.338Z","module_hash":"cfaf6bb208fa501d8fefcaa75c6ad1107128ea4b9baf739b43b4e803f28eef9b","functions":[{"id":"func/PageController.constructor","name":"PageController.constructor","line":13,"end_line":18,"hash":"09ba0e480cbc1213c699f45c7b6ef59e584dce4e8d4f1ab0adf5094435eba06f"},{"id":"func/PageController.setInput","name":"PageController.setInput","line":21,"end_line":24,"hash":"595484662b7ca07ef5eef5cebbff06309242552d9b4d15687df02f260ba88244"},{"id":"func/PageController.submit","name":"PageController.submit","line":29,"end_line":44,"hash":"bd2acb67a3a3e33cf8ed9f61886796102c1689486a1ea6757153b2be097eb704"},{"id":"func/PageController._handleSubmitFailure","name":"PageController._handleSubmitFailure","line":49,"end_line":58,"hash":"3d9ad3eb3a25e11b8a1eef164b2757034499b85b439754bb606622f99c72d5f9"}]}
// mutate4javascript-manifest-end
