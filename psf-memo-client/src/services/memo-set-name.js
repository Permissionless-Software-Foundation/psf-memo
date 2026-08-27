/*
  Memo set-name behavior: compose, validate, and broadcast a Memo "set name"
  message.

  A Memo set-name transaction is an OP_RETURN Bitcoin Cash transaction carrying
  the Memo set-name protocol prefix (0x6d01) followed by the name text.
  Broadcasting is done through a wallet that exposes the minimal-slp-wallet
  adapter surface (walletInfo, getUtxos(), sendOpReturn()).

  The wallet and profiles store are injected so this module stays testable and
  free of network/UI concerns; environmentally unsuitable I/O lives behind those
  small adapter boundaries.

  Constants
    MEMO_SET_NAME_PREFIX : hex prefix for the Memo "set name" action (0x6d01)
    MAX_NAME_BYTES       : maximum allowed name length (77 bytes per memo.sv)
*/

const MemoProfileTextAction = require('./memo-profile-text-action')

const MEMO_SET_NAME_PREFIX = '6d01'
const MAX_NAME_BYTES = 77

class MemoSetName extends MemoProfileTextAction {
  static config = MemoProfileTextAction.profileTextConfig({
    prefix: MEMO_SET_NAME_PREFIX,
    noun: 'name',
    code: 'name',
    maxBytes: MAX_NAME_BYTES,
    profileMethod: 'setName'
  })
}

MemoSetName.MEMO_SET_NAME_PREFIX = MEMO_SET_NAME_PREFIX
MemoSetName.MAX_NAME_BYTES = MAX_NAME_BYTES

module.exports = MemoSetName

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T16:58:25.109Z","module_hash":"4ec10f6de6698eaa32c5fa4c91b8432f910c0dfa2842742aff90ef390a219189","functions":[]}
// mutate4javascript-manifest-end
