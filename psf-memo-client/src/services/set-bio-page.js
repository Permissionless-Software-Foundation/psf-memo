/*
  Set Bio Page behavior: compose and broadcast a Memo profile text, with a
  byte counter that counts down from the bio limit.

  This is the testable controller behind the React "Set Bio" page. It wraps
  the Memo set-bio behavior (src/services/memo-set-bio.js) through the shared
  ProfileTextPage base and adds the page-level config: the injected handler
  key, the in-flight flag, the byte limit, and the local validation codes.

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
}

SetBioPage.SET_BIO_PATH = SET_BIO_PATH
SetBioPage.ACCOUNT_PATH = ProfileTextPage.ACCOUNT_PATH

module.exports = SetBioPage
