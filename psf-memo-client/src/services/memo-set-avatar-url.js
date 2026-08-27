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

const MemoProfileTextAction = require('./memo-profile-text-action')

const MEMO_SET_AVATAR_URL_PREFIX = '6d0a'
const MAX_AVATAR_URL_BYTES = 217

class MemoSetAvatarUrl extends MemoProfileTextAction {
  static config = MemoProfileTextAction.profileTextConfig({
    prefix: MEMO_SET_AVATAR_URL_PREFIX,
    noun: 'avatar URL',
    code: 'avatar_url',
    maxBytes: MAX_AVATAR_URL_BYTES,
    profileMethod: 'setAvatarUrl'
  })
}

MemoSetAvatarUrl.MEMO_SET_AVATAR_URL_PREFIX = MEMO_SET_AVATAR_URL_PREFIX
MemoSetAvatarUrl.MAX_AVATAR_URL_BYTES = MAX_AVATAR_URL_BYTES

module.exports = MemoSetAvatarUrl

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T16:58:11.278Z","module_hash":"473dc38c01f201fb09484ef6288c8ab86ca3457f9e3871cee279c119b65bb44a","functions":[]}
// mutate4javascript-manifest-end
