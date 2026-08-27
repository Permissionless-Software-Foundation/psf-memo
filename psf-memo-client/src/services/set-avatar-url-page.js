/*
  Set Avatar URL Page behavior: compose and broadcast a Memo avatar URL,
  with a byte counter that counts down from the avatar URL limit.

  This is the testable controller behind the React "Set Avatar URL" page. It
  wraps the Memo set-avatar-url behavior (src/services/memo-set-avatar-url.js)
  through the shared ProfileTextPage base and adds the page-level config: the
  injected handler key, the in-flight flag, the byte limit, and the local
  validation codes.

  The memoSetAvatarUrl and navigate concerns are injected so this module stays
  free of UI/network concerns; environmentally unsuitable I/O lives behind those
  small adapter boundaries.
*/

const ProfileTextPage = require('./profile-text-page')
const MemoSetAvatarUrl = require('./memo-set-avatar-url')

const SET_AVATAR_URL_PATH = '/memo/set-avatar-url'

class SetAvatarUrlPage extends ProfileTextPage {
  static config = {
    handlerKey: 'memoSetAvatarUrl',
    busyKey: 'settingAvatarUrl',
    actionMethod: 'setAvatarUrl',
    requiresMsg: 'Set avatar URL requires a memo set-avatar-url handler.',
    maxBytes: MemoSetAvatarUrl.MAX_AVATAR_URL_BYTES,
    validationCodes: ['avatar_url_validation', 'avatar_url_length']
  }
}

SetAvatarUrlPage.SET_AVATAR_URL_PATH = SET_AVATAR_URL_PATH
SetAvatarUrlPage.ACCOUNT_PATH = ProfileTextPage.ACCOUNT_PATH

module.exports = SetAvatarUrlPage
