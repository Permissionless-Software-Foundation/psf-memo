/*
  Memo mute/unmute behavior: compose, validate, and broadcast a Memo
  mute (0x6d16) or unmute (0x6d17) action.

  A mute transaction carries the mutee's 20-byte hash160. The cash
  address is converted with the wallet's embedded bch-js Address.toHash160()
  so no separate cashaddr dependency is needed.

  The wallet and an injected profile store are used so this module stays
  testable and free of UI/network concerns; environmentally unsuitable I/O
  lives behind those small adapter boundaries.

  Constants
    MEMO_MUTE_PREFIX   : hex prefix for the Memo "mute" action (0x6d16)
    MEMO_UNMUTE_PREFIX : hex prefix for the Memo "unmute" action (0x6d17)
    PK_HASH_LENGTH     : size of the mutee hash160 in bytes (20)
*/

const MemoAction = require('./memo-action')

const MEMO_MUTE_PREFIX = '6d16'
const MEMO_UNMUTE_PREFIX = '6d17'
const PK_HASH_LENGTH = 20

class MemoMute extends MemoAction {
  static config = {
    prefix: MEMO_MUTE_PREFIX,
    walletRequiredMsg: 'Memo mute requires a wallet.',
    lengthMessage: 'Mute address is invalid.',
    emptyMessage: 'Mute address is required.',
    lengthCode: 'mute_validation',
    validationCode: 'mute_validation'
  }

  constructor (deps = {}) {
    super(deps)
    this.profiles = deps.profiles
  }

  // Validate a candidate cash address. Returns { ok: true } or throws a typed
  // validation error.
  validate (addr) {
    if (typeof addr !== 'string' || addr.trim().length === 0) {
      const err = new Error(this.emptyMessage)
      err.code = this.validationCode
      throw err
    }

    try {
      this._toHash160(addr)
      return { ok: true }
    } catch (err) {
      const validationErr = new Error(`Invalid cash address: ${addr}`)
      validationErr.code = this.validationCode
      throw validationErr
    }
  }

  // Broadcast a Memo mute for the given mutee address.
  async mute (muteeAddr) {
    return this._broadcastAction(muteeAddr, MEMO_MUTE_PREFIX, true)
  }

  // Broadcast a Memo unmute for the given mutee address.
  async unmute (muteeAddr) {
    return this._broadcastAction(muteeAddr, MEMO_UNMUTE_PREFIX, false)
  }

  // Internal: validate, broadcast, and reflect a mute/unmute action.
  async _broadcastAction (muteeAddr, prefix, isMute) {
    if (!this.wallet) {
      throw new Error(this.walletRequiredMsg)
    }
    this._ensureBchjs()

    this.validate(muteeAddr)

    await this.wallet.getUtxos()

    const hash160 = this._toHash160(muteeAddr)
    const raw = Buffer.from(hash160, 'hex')

    const txid = await this.wallet.sendOpReturn(raw, prefix)

    this.reflect(txid, muteeAddr, isMute)

    return txid
  }

  // Convert a cash address to its 20-byte hash160 hex string using the wallet's
  // embedded bch-js.
  _toHash160 (addr) {
    return this.wallet.bchjs.Address.toHash160(addr)
  }

  _ensureBchjs () {
    if (!this.wallet.bchjs || typeof this.wallet.bchjs.Address.toHash160 !== 'function') {
      throw new Error('Wallet does not expose bch-js Address.toHash160.')
    }
  }

  // Record the new mute state on the injected profile store when it exposes
  // the mute methods.
  reflect (txid, muteeAddr, isMute) {
    if (this.profiles && typeof this.profiles.setMuteState === 'function') {
      const myAddr = this.wallet?.walletInfo?.cashAddress
      this.profiles.setMuteState(myAddr, muteeAddr, isMute)
    }
  }
}

MemoMute.MEMO_MUTE_PREFIX = MEMO_MUTE_PREFIX
MemoMute.MEMO_UNMUTE_PREFIX = MEMO_UNMUTE_PREFIX
MemoMute.PK_HASH_LENGTH = PK_HASH_LENGTH

module.exports = MemoMute
