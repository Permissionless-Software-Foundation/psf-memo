/*
  Shared base for Memo follow/unfollow and mute/unmute (state) actions.

  These actions all validate a cash address, convert it to its 20-byte
  hash160, and broadcast an OP_RETURN carrying that hash160 payload with the
  protocol prefix for a given state transition. On success they reflect the
  new state on an injected profile store.

  Subclasses extend MemoAction's config with the state-specific messages and
  codes, plus `reflectMethod` naming which profile store method records the
  new state, and expose thin methods (follow/unfollow or mute/unmute) that
  delegate to the shared `_setState` helper with the appropriate prefix.

  The wallet and an injected profile store are used so this module stays
  testable and free of UI/network concerns; environmentally unsuitable I/O
  lives behind those small adapter boundaries.
*/

const MemoAction = require('./memo-action')
const { hexToBytes } = require('./hex')

const PK_HASH_LENGTH = 20

class MemoStateAction extends MemoAction {
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

  // Internal: validate, broadcast, and reflect a state transition. Subclasses
  // delegate their public methods here with the transition's prefix.
  async _setState (targetAddr, prefix, state) {
    if (!this.wallet) {
      throw new Error(this.walletRequiredMsg)
    }
    this._ensureBchjs()

    this.validate(targetAddr)

    await this.wallet.getUtxos()

    const hash160 = this._toHash160(targetAddr)
    const raw = hexToBytes(hash160, PK_HASH_LENGTH, 'Address hash160')

    const txid = await this.wallet.sendOpReturn(raw, prefix)

    this.reflect(txid, targetAddr, state)

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

  // Record the new state on the injected profile store method named by the
  // subclass config.
  reflect (txid, targetAddr, state) {
    const reflectMethod = this.constructor.config.reflectMethod
    if (this.profiles && typeof this.profiles[reflectMethod] === 'function') {
      const myAddr = this.wallet?.walletInfo?.cashAddress
      this.profiles[reflectMethod](myAddr, targetAddr, state)
    }
  }
}

MemoStateAction.PK_HASH_LENGTH = PK_HASH_LENGTH

module.exports = MemoStateAction

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-04T18:22:56.557Z","module_hash":"938e453562e0258b383cbc31f449fccc2e6105c805c97c52fb13bef3ee0fe6b4","functions":[{"id":"func/MemoStateAction.constructor","name":"MemoStateAction.constructor","line":25,"end_line":28,"hash":"9407b43605444074011b1da595c9d53356352c72b0d847e00365d79ad705663a"},{"id":"func/MemoStateAction.validate","name":"MemoStateAction.validate","line":32,"end_line":47,"hash":"4154af442c36324ba147dff352c55610397fb430c9b62fbbe44728ab0e379179"},{"id":"func/MemoStateAction._setState","name":"MemoStateAction._setState","line":51,"end_line":69,"hash":"86b976bcbe8532f7bfb9bdc989976f2266bce3d0e8c3a77a1f3e0b8413951684"},{"id":"func/MemoStateAction._toHash160","name":"MemoStateAction._toHash160","line":73,"end_line":75,"hash":"3ed2ba4853b718a8316345c9f988ed3bed3ef647de3fd9761ee3c9e0bee86070"},{"id":"func/MemoStateAction._ensureBchjs","name":"MemoStateAction._ensureBchjs","line":77,"end_line":81,"hash":"92828d9038c9a4d367e80edd7f129291e434d57aae80b332081a66af9896a5d6"},{"id":"func/MemoStateAction.reflect","name":"MemoStateAction.reflect","line":85,"end_line":91,"hash":"4ef0ab37e0ab08a681475805c5e53a010b35aa56560bc84f6d2189154ed7fa7d"}]}
// mutate4javascript-manifest-end
