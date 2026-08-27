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

const MemoAction = require('./memo-action')

const MEMO_SET_BIO_PREFIX = '6d05'
const MAX_BIO_BYTES = 217

class MemoSetBio extends MemoAction {
  static config = {
    prefix: MEMO_SET_BIO_PREFIX,
    walletRequiredMsg: 'Memo set bio requires a wallet.',
    lengthMessage: `Bio is too long. Maximum is ${MAX_BIO_BYTES} bytes.`,
    emptyMessage: 'Bio must not be empty.',
    lengthCode: 'bio_length',
    validationCode: 'bio_validation',
    maxBytes: MAX_BIO_BYTES,
    profileMethod: 'setBio'
  }

  // Compose and broadcast a Memo set-bio transaction for the given bio.
  // Resolves with the transaction id, or rejects with a typed error.
  async setBio (bio) {
    return this.broadcast(bio)
  }
}

MemoSetBio.MEMO_SET_BIO_PREFIX = MEMO_SET_BIO_PREFIX
MemoSetBio.MAX_BIO_BYTES = MAX_BIO_BYTES

module.exports = MemoSetBio
