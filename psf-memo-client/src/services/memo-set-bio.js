/*
  Memo set-bio behavior: compose, validate, and broadcast a Memo "set profile
  text" message.

  A Memo set-bio transaction is an OP_RETURN Bitcoin Cash transaction carrying
  the Memo set-profile protocol prefix (0x6d05) followed by the bio text.
  Broadcasting is done through a wallet that exposes the minimal-slp-wallet
  adapter surface (walletInfo, getUtxos(), sendOpReturn()).

  The wallet and profiles store are injected so this module stays testable and
  free of network/UI concerns; environmentally unsuitable I/O lives behind those
  small adapter boundaries.

  Constants
    MEMO_SET_BIO_PREFIX : hex prefix for the Memo "set profile text" action (0x6d05)
    MAX_BIO_BYTES       : maximum allowed bio length (217 bytes per memo.sv)
*/

const MemoProfileTextAction = require('./memo-profile-text-action')

const MEMO_SET_BIO_PREFIX = '6d05'
const MAX_BIO_BYTES = 217

class MemoSetBio extends MemoProfileTextAction {
  static config = MemoProfileTextAction.profileTextConfig({
    prefix: MEMO_SET_BIO_PREFIX,
    noun: 'bio',
    code: 'bio',
    maxBytes: MAX_BIO_BYTES,
    profileMethod: 'setBio'
  })
}

MemoSetBio.MEMO_SET_BIO_PREFIX = MEMO_SET_BIO_PREFIX
MemoSetBio.MAX_BIO_BYTES = MAX_BIO_BYTES

module.exports = MemoSetBio

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T16:55:54.606Z","module_hash":"4da70e80defe9ae983bb914d305228497f4877dd43be7f63d6858bf456cf3ab7","functions":[]}
// mutate4javascript-manifest-end
