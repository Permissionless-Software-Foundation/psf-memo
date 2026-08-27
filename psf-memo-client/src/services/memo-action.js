/*
  Shared base for Memo protocol actions that broadcast an OP_RETURN
  transaction through a wallet and reflect the result on an injected store.

  Subclasses supply the protocol-specific pieces, either as a static
  `config` object (prefix, walletRequiredMsg, lengthMessage, emptyMessage,
  lengthCode, validationCode) or as methods:
    isTooLong(value)  - true when the value exceeds the action's limit
    reflect(txid, value) - record the broadcast result on the injected store

  Optional config keys enable shared defaults for a profile text action:
    maxBytes         - byte limit used by the default isTooLong(value)
    profileMethod    - injected profile store method used by the default
                       reflect(txid, value)
*/

const { byteLength } = require('./utf8')

class MemoAction {
  constructor (deps = {}) {
    this.wallet = deps.wallet
    const cfg = this.constructor.config
    this.prefix = cfg.prefix
    this.walletRequiredMsg = cfg.walletRequiredMsg
    this.lengthMessage = cfg.lengthMessage
    this.emptyMessage = cfg.emptyMessage
    this.lengthCode = cfg.lengthCode
    this.validationCode = cfg.validationCode
    this.maxBytes = cfg.maxBytes ?? null
    this.profileMethod = cfg.profileMethod ?? null
    // Profile text actions (config.profileMethod set) receive the injected
    // profile store here so subclasses do not each re-wire it.
    if (this.profileMethod) {
      this.profiles = deps.profiles
    }
  }

  // Default over-length check driven by the config maxBytes. Subclasses that
  // measure limits differently override this method.
  isTooLong (value) {
    if (this.maxBytes === null) {
      throw new Error('isTooLong must be provided by the subclass.')
    }
    return byteLength(value) > this.maxBytes
  }

  // Default reflect that records the value on the injected profile store
  // method named by the config profileMethod. Subclasses with other stores
  // override this method.
  reflect (txid, value) {
    if (
      this.profileMethod &&
      this.profiles &&
      typeof this.profiles[this.profileMethod] === 'function'
    ) {
      this.profiles[this.profileMethod](this.wallet.walletInfo.cashAddress, value)
    }
  }

  // Validate a candidate value.
  // Returns { ok: true } or { ok: false, type: 'validation' | 'length' }.
  validate (value) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return { ok: false, type: 'validation' }
    }

    if (this.isTooLong(value)) {
      return { ok: false, type: 'length' }
    }

    return { ok: true }
  }

  // Compose and broadcast the action for the given value.
  // Resolves with the transaction id, or rejects with a typed error.
  async broadcast (value) {
    const check = this.validate(value)
    this._throwIfInvalid(check)

    if (!this.wallet) {
      throw new Error(this.walletRequiredMsg)
    }

    // Refresh the wallet's spendable UTXO store so the broadcast has inputs.
    await this.wallet.getUtxos()

    // The wallet's public sendOpReturn(msg, prefix) resolves walletInfo and its
    // own spendable UTXOs internally, so only the value and prefix are passed.
    const txid = await this.wallet.sendOpReturn(value, this.prefix)

    // Reflect the result on the injected store once broadcast succeeds.
    this.reflect(txid, value)

    return txid
  }

  // Throw the appropriate typed error when a value fails validation.
  _throwIfInvalid (check) {
    if (check.ok) return

    const err = new Error(
      check.type === 'length' ? this.lengthMessage : this.emptyMessage
    )
    err.code = check.type === 'length' ? this.lengthCode : this.validationCode
    throw err
  }
}

module.exports = MemoAction

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T15:06:04.806Z","module_hash":"c13b38d46acf1640411785ec6f78e03770c1608259e30dbafff054d3775b8700","functions":[{"id":"func/MemoAction.constructor","name":"MemoAction.constructor","line":20,"end_line":36,"hash":"c0dd70bac41e1f9b511c90fc12e5b2f7ea482fa8647d9a26cdfc8ba756de9690"},{"id":"func/MemoAction.isTooLong","name":"MemoAction.isTooLong","line":40,"end_line":45,"hash":"ee208b9282d0a225ca8a8acca665d288cdb66f351dceb15fadd67df1de493343"},{"id":"func/MemoAction.reflect","name":"MemoAction.reflect","line":50,"end_line":58,"hash":"1f94e4db07b0c26cefbbdab9c2641790f772c7c245d78b8864302c242aee930f"},{"id":"func/MemoAction.validate","name":"MemoAction.validate","line":62,"end_line":72,"hash":"b8598a392b3a65b5f1fe329048a041a087ef0735806fd03f42fe0cf7e19ef7fc"},{"id":"func/MemoAction.broadcast","name":"MemoAction.broadcast","line":76,"end_line":95,"hash":"07853c0eec474cae372e901db388b62b50020db0aff1f63bb587b9e494f4ede5"},{"id":"func/MemoAction._throwIfInvalid","name":"MemoAction._throwIfInvalid","line":98,"end_line":106,"hash":"dafb785969f30b0fa347c8e699e4bf3302ce3a9ef0d3481f1ffa5c276992c808"}]}
// mutate4javascript-manifest-end
