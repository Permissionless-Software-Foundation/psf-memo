/*
  Memo set-avatar-url behavior: compose, validate, and broadcast a Memo
  "set profile picture" message.

  A Memo set-avatar-url transaction is an OP_RETURN Bitcoin Cash transaction
  carrying the Memo set-profile-picture protocol prefix (0x6d0a) followed by
  the URL text. Broadcasting is done through a wallet that exposes the
  minimal-slp-wallet adapter surface (walletInfo, getUtxos(), sendOpReturn()).

  The wallet and profiles store are injected so this module stays testable and
  free of network/UI concerns; environmentally unsuitable I/O lives behind those
  small adapter boundaries.

  Constants
    MEMO_SET_AVATAR_URL_PREFIX : hex prefix for the Memo "set profile picture" action (0x6d0a)
    MAX_AVATAR_URL_BYTES       : maximum allowed URL length (217 bytes per memo.sv)
*/

const MemoAction = require('./memo-action')

const MEMO_SET_AVATAR_URL_PREFIX = '6d0a'
const MAX_AVATAR_URL_BYTES = 217

class MemoSetAvatarUrl extends MemoAction {
  static config = {
    prefix: MEMO_SET_AVATAR_URL_PREFIX,
    walletRequiredMsg: 'Memo set avatar URL requires a wallet.',
    lengthMessage: `Avatar URL is too long. Maximum is ${MAX_AVATAR_URL_BYTES} bytes.`,
    emptyMessage: 'Avatar URL must not be empty.',
    lengthCode: 'avatar_url_length',
    validationCode: 'avatar_url_validation',
    maxBytes: MAX_AVATAR_URL_BYTES,
    profileMethod: 'setAvatarUrl'
  }

  // Compose and broadcast a Memo set-avatar-url transaction for the given URL.
  // Resolves with the transaction id, or rejects with a typed error.
  async setAvatarUrl (url) {
    return this.broadcast(url)
  }
}

MemoSetAvatarUrl.MEMO_SET_AVATAR_URL_PREFIX = MEMO_SET_AVATAR_URL_PREFIX
MemoSetAvatarUrl.MAX_AVATAR_URL_BYTES = MAX_AVATAR_URL_BYTES

module.exports = MemoSetAvatarUrl
