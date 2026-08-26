/*
  Set Name Page behavior: compose and broadcast a Memo display name, with a
  byte counter that counts down from the name limit.

  This is the testable controller behind the React "Set Name" page. It wraps
  the Memo set-name behavior (src/services/memo-set-name.js) and adds page-level
  concerns: holding the current input, computing the remaining byte count,
  surfacing validation/length errors, and navigating to the account page after
  a successful broadcast.

  The memoSetName and navigate concerns are injected so this module stays free
  of UI/network concerns; environmentally unsuitable I/O lives behind those small
  adapter boundaries.
*/

const PageController = require('./page-controller')
const MemoSetName = require('./memo-set-name')
const { byteLength } = require('./utf8')

const SET_NAME_PATH = '/memo/set-name'
const ACCOUNT_PATH = '/account'

class SetNamePage extends PageController {
  constructor (deps = {}) {
    super(deps)
    this.memoSetName = deps.memoSetName || null
    this.settingName = false
    this.successPath = ACCOUNT_PATH
    this.validationCodes = ['name_validation', 'name_length']
  }

  // Bytes remaining before the name limit is reached.
  remainingCount () {
    return MemoSetName.MAX_NAME_BYTES - byteLength(this.input)
  }

  // Set the in-flight setting-name flag.
  _setBusy (value) {
    this.settingName = value
  }

  // Run the memo set-name action for the current input.
  async _perform (input) {
    if (!this.memoSetName) {
      throw new Error('Set name requires a memo set-name handler.')
    }
    return this.memoSetName.setName(input)
  }
}

SetNamePage.SET_NAME_PATH = SET_NAME_PATH
SetNamePage.ACCOUNT_PATH = ACCOUNT_PATH

module.exports = SetNamePage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T12:18:52.970Z","module_hash":"5e4ff62bceef737444b487d65f85608ba84ffc0bac69791d1347f7c1dfd8a300","functions":[{"id":"func/SetNamePage.constructor","name":"SetNamePage.constructor","line":24,"end_line":30,"hash":"4ce053830f485ce8a0fba4495cd85fc5e2cac3c9db88b5cbf1e8c66a371a9752"},{"id":"func/SetNamePage.remainingCount","name":"SetNamePage.remainingCount","line":33,"end_line":35,"hash":"47c88116b836dde07c64ae4de65c89a6d702a7889e032f2df163dd84cf48083f"},{"id":"func/SetNamePage._setBusy","name":"SetNamePage._setBusy","line":38,"end_line":40,"hash":"a0947ed899e0def1f6ae243197d409f5603c4820467f0e0fafdcb4deadb3a92b"},{"id":"func/SetNamePage._perform","name":"SetNamePage._perform","line":43,"end_line":48,"hash":"8614f25b06dcb21b81ab94b4a4611c5e3719ebf4ed7ab13e13976ab0d5938b27"}]}
// mutate4javascript-manifest-end
