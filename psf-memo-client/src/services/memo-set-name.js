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

const MemoAction = require('./memo-action')
const { byteLength } = require('./utf8')

const MEMO_SET_NAME_PREFIX = '6d01'
const MAX_NAME_BYTES = 77

class MemoSetName extends MemoAction {
  static config = {
    prefix: MEMO_SET_NAME_PREFIX,
    walletRequiredMsg: 'Memo set name requires a wallet.',
    lengthMessage: `Name is too long. Maximum is ${MAX_NAME_BYTES} bytes.`,
    emptyMessage: 'Name must not be empty.',
    lengthCode: 'name_length',
    validationCode: 'name_validation'
  }

  constructor (deps = {}) {
    super(deps)
    this.profiles = deps.profiles
  }

  // A name is over-length when it exceeds the byte limit.
  isTooLong (name) {
    return byteLength(name) > MAX_NAME_BYTES
  }

  // Compose and broadcast a Memo set-name transaction for the given name.
  // Resolves with the transaction id, or rejects with a typed error.
  async setName (name) {
    return this.broadcast(name)
  }

  // Record the new name on the injected profile store when one is present.
  reflect (txid, name) {
    if (this.profiles && typeof this.profiles.setName === 'function') {
      this.profiles.setName(this.wallet.walletInfo.cashAddress, name)
    }
  }
}

MemoSetName.MEMO_SET_NAME_PREFIX = MEMO_SET_NAME_PREFIX
MemoSetName.MAX_NAME_BYTES = MAX_NAME_BYTES

module.exports = MemoSetName

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T12:18:41.068Z","module_hash":"98a611f25cf764ac9f182aa9ceb60e0d6ea750d391ba26562c034ee84ef4a9ae","functions":[{"id":"func/MemoSetName.constructor","name":"MemoSetName.constructor","line":35,"end_line":38,"hash":"9407b43605444074011b1da595c9d53356352c72b0d847e00365d79ad705663a"},{"id":"func/MemoSetName.isTooLong","name":"MemoSetName.isTooLong","line":41,"end_line":43,"hash":"e25b4701e1bf64f197980310a29c195a7f3b429ea41be4f01732541c5a9b7cfc"},{"id":"func/MemoSetName.setName","name":"MemoSetName.setName","line":47,"end_line":49,"hash":"9226b63b60a573a9dfb5c7bbb1449d1a138f30b648642d345c5162d012a2cfc0"},{"id":"func/MemoSetName.reflect","name":"MemoSetName.reflect","line":52,"end_line":56,"hash":"3cfed5e8ec7acf592e07e67659b4d8e075d98bbddf79755b8a31b76fd1ae5696"}]}
// mutate4javascript-manifest-end
