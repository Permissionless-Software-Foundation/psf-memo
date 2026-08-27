/*
  Set Bio Page behavior: compose and broadcast a Memo profile text, with a
  byte counter that counts down from the bio limit.

  This is the testable controller behind the React "Set Bio" page. It wraps
  the Memo set-bio behavior (src/services/memo-set-bio.js) and adds page-level
  concerns: holding the current input, computing the remaining byte count,
  surfacing validation/length errors, and navigating to the account page after
  a successful broadcast.

  The memoSetBio and navigate concerns are injected so this module stays free
  of UI/network concerns; environmentally unsuitable I/O lives behind those small
  adapter boundaries.
*/

const PageController = require('./page-controller')
const MemoSetBio = require('./memo-set-bio')
const { byteLength } = require('./utf8')

const SET_BIO_PATH = '/memo/set-bio'
const ACCOUNT_PATH = '/account'

class SetBioPage extends PageController {
  constructor (deps = {}) {
    super(deps)
    this.memoSetBio = deps.memoSetBio || null
    this.settingBio = false
    this.successPath = ACCOUNT_PATH
    this.validationCodes = ['bio_validation', 'bio_length']
  }

  // Bytes remaining before the bio limit is reached.
  remainingCount () {
    return MemoSetBio.MAX_BIO_BYTES - byteLength(this.input)
  }

  // Set the in-flight setting-bio flag.
  _setBusy (value) {
    this.settingBio = value
  }

  // Run the memo set-bio action for the current input.
  async _perform (input) {
    if (!this.memoSetBio) {
      throw new Error('Set bio requires a memo set-bio handler.')
    }
    return this.memoSetBio.setBio(input)
  }
}

SetBioPage.SET_BIO_PATH = SET_BIO_PATH
SetBioPage.ACCOUNT_PATH = ACCOUNT_PATH

module.exports = SetBioPage
