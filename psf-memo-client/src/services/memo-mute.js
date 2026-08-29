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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-29T03:07:20.508Z","module_hash":"33469aed44ef4e9225a9ea952c5cd9335f46a0b1c1298525b3fd51ae2f77f817","functions":[{"id":"func/MemoMute.constructor","name":"MemoMute.constructor","line":35,"end_line":38,"hash":"9407b43605444074011b1da595c9d53356352c72b0d847e00365d79ad705663a"},{"id":"func/MemoMute.validate","name":"MemoMute.validate","line":42,"end_line":57,"hash":"4154af442c36324ba147dff352c55610397fb430c9b62fbbe44728ab0e379179"},{"id":"func/MemoMute.mute","name":"MemoMute.mute","line":60,"end_line":62,"hash":"60306e96a5b6ef4bac8cf3fc516785880b2ccab835730019bbd4b9bbfa27e464"},{"id":"func/MemoMute.unmute","name":"MemoMute.unmute","line":65,"end_line":67,"hash":"f6476de3d8b62b3f5e864dc83d005452bc9842d9accfed2c64f57082e0fec7b3"},{"id":"func/MemoMute._broadcastAction","name":"MemoMute._broadcastAction","line":70,"end_line":88,"hash":"05f7860e1db59b7611027186c859d790f8d8c74b150daf3b687a8c9dc453f751"},{"id":"func/MemoMute._toHash160","name":"MemoMute._toHash160","line":92,"end_line":94,"hash":"3ed2ba4853b718a8316345c9f988ed3bed3ef647de3fd9761ee3c9e0bee86070"},{"id":"func/MemoMute._ensureBchjs","name":"MemoMute._ensureBchjs","line":96,"end_line":100,"hash":"92828d9038c9a4d367e80edd7f129291e434d57aae80b332081a66af9896a5d6"},{"id":"func/MemoMute.reflect","name":"MemoMute.reflect","line":104,"end_line":109,"hash":"6053ec62558bbc19bd5e55b19541a6fe5cde28fe6fbf7c4eede209652e835bc4"}]}
// mutate4javascript-manifest-end
