/*
  Set Bio Page behavior: compose and broadcast a Memo profile text, with a
  byte counter that counts down from the bio limit.

  This is the testable controller behind the React "Set Bio" page. It wraps
  the Memo set-bio behavior (src/services/memo-set-bio.js) through the shared
  ProfileTextPage base and adds the page-level config: the injected handler
  key, the in-flight flag, the byte limit, and the local validation codes. It
  also reads the account's stored bio so the page can show it above the input.

  The memoSetBio and navigate concerns are injected so this module stays free
  of UI/network concerns; environmentally unsuitable I/O lives behind those
  small adapter boundaries.
*/

const ProfileTextPage = require('./profile-text-page')
const MemoSetBio = require('./memo-set-bio')

const SET_BIO_PATH = '/memo/set-bio'

class SetBioPage extends ProfileTextPage {
  static config = {
    handlerKey: 'memoSetBio',
    busyKey: 'settingBio',
    actionMethod: 'setBio',
    requiresMsg: 'Set bio requires a memo set-bio handler.',
    maxBytes: MemoSetBio.MAX_BIO_BYTES,
    validationCodes: ['bio_validation', 'bio_length']
  }

  constructor (deps = {}) {
    super(deps)
    // The authenticated wallet and profile store let the page show the
    // account's existing bio. Prefer explicit injection, then fall back to the
    // action handler that already holds both.
    this.wallet = deps.wallet || this.memoSetBio?.wallet || null
    this.profiles = deps.profiles || this.memoSetBio?.profiles || null
  }

  // The account's stored bio, or null when none is set.
  getExistingBio () {
    const addr = this.wallet?.walletInfo?.cashAddress
    if (!addr || !this.profiles || typeof this.profiles.getBio !== 'function') {
      return null
    }
    return this.profiles.getBio(addr) || null
  }

  // Whether the account already has a bio to show above the input.
  hasExistingBio () {
    return this.getExistingBio() !== null
  }

  // Whether the page should show that the account has no bio yet.
  showsNoExistingBio () {
    return !this.hasExistingBio()
  }
}

SetBioPage.SET_BIO_PATH = SET_BIO_PATH
SetBioPage.ACCOUNT_PATH = ProfileTextPage.ACCOUNT_PATH

module.exports = SetBioPage
