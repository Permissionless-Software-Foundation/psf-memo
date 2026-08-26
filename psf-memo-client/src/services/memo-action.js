/*
  Shared base for Memo protocol actions that broadcast an OP_RETURN
  transaction through a wallet and reflect the result on an injected store.

  Subclasses supply the protocol-specific pieces, either as a static
  `config` object (prefix, walletRequiredMsg, lengthMessage, emptyMessage,
  lengthCode, validationCode) or as methods:
    isTooLong(value)  - true when the value exceeds the action's limit
    reflect(txid, value) - record the broadcast result on the injected store
*/

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
// {"version":1,"tested_at":"2026-08-26T12:18:08.027Z","module_hash":"9f6ac3a351ce499162bd5f350ac2eec15f7a4a88450334b49cb1c445b83b0eea","functions":[{"id":"func/MemoAction.constructor","name":"MemoAction.constructor","line":13,"end_line":22,"hash":"881f01aa2a258bcbc4750b69dc303a03139b6368decb2e10e667dc2f23f5ea80"},{"id":"func/MemoAction.validate","name":"MemoAction.validate","line":26,"end_line":36,"hash":"b8598a392b3a65b5f1fe329048a041a087ef0735806fd03f42fe0cf7e19ef7fc"},{"id":"func/MemoAction.broadcast","name":"MemoAction.broadcast","line":40,"end_line":59,"hash":"07853c0eec474cae372e901db388b62b50020db0aff1f63bb587b9e494f4ede5"},{"id":"func/MemoAction._throwIfInvalid","name":"MemoAction._throwIfInvalid","line":62,"end_line":70,"hash":"dafb785969f30b0fa347c8e699e4bf3302ce3a9ef0d3481f1ffa5c276992c808"}]}
// mutate4javascript-manifest-end
