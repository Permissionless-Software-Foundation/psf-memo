/*
  Shared base for Memo actions that reference a parent poll by txid (e.g. an
  add-poll-option or a poll-vote). Such actions broadcast an OP_RETURN payload
  that embeds the parent poll's 32-byte txid followed by a short UTF-8 value.

  Subclasses extend MemoAction's config with the poll-specific messages and
  codes, and supply the wire payload via the injected buildPayload function.

  The wallet and an injected poll store are used so this module stays testable
  and free of UI/network concerns; environmentally unsuitable I/O lives behind
  those small adapter boundaries.
*/

const MemoAction = require('./memo-action')
const { byteLength } = require('./utf8')

class MemoTxidAction extends MemoAction {
  constructor (deps = {}) {
    super(deps)
    this.pollTxid = deps.pollTxid || ''
    this.polls = deps.polls || null
  }

  // Compose and broadcast an action that embeds this.pollTxid plus the given
  // value through the supplied buildPayload(pollTxid, value) function.
  async broadcastTxid (value, buildPayload) {
    const check = this.validate(value)
    this._throwIfInvalid(check)

    if (!this.wallet) {
      throw new Error(this.walletRequiredMsg)
    }

    if (!this.pollTxid) {
      const err = new Error('Poll txid is required.')
      err.code = this.validationCode
      throw err
    }

    await this.wallet.getUtxos()

    const raw = buildPayload(this.pollTxid, value)
    const txid = await this.wallet.sendOpReturn(raw, this.prefix)

    this.reflect(txid, value)

    return txid
  }

  // Record the new child record on the injected poll store when one is
  // present. Subclasses supply `reflectMethod` (the store method to call) and
  // `valueField` (the record field holding the parsed value) in their config.
  reflect (txid, value) {
    const cfg = this.constructor.config
    if (this.polls && typeof this.polls[cfg.reflectMethod] === 'function') {
      this.polls[cfg.reflectMethod]({
        txid,
        pollTxid: this.pollTxid,
        address: this.wallet.walletInfo.cashAddress,
        [cfg.valueField]: value
      })
    }
  }

  // A poll child value is over-length when its UTF-8 byte count exceeds the
  // subclass's `maxBytes` limit.
  isTooLong (value) {
    return byteLength(value) > this.constructor.config.maxBytes
  }
}

module.exports = MemoTxidAction

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T23:37:21.781Z","module_hash":"b43e695aee6198c465b2cdbb0fbb405fccb0aadb573f56c3d3249de3920c1939","functions":[{"id":"func/MemoTxidAction.constructor","name":"MemoTxidAction.constructor","line":18,"end_line":22,"hash":"399be38855508b45b6a07e00361d4fb36186df3fdac5e2a68e004f7dcbdd353c"},{"id":"func/MemoTxidAction.broadcastTxid","name":"MemoTxidAction.broadcastTxid","line":26,"end_line":48,"hash":"395ea932dd691049556a66a3d4c674778818b8b53152c0ae7088d960524fc400"},{"id":"func/MemoTxidAction.reflect","name":"MemoTxidAction.reflect","line":53,"end_line":63,"hash":"7d61638162b7142298e021b02cbdeaca359f33503b3b84a308498f0479c80c5c"},{"id":"func/MemoTxidAction.isTooLong","name":"MemoTxidAction.isTooLong","line":67,"end_line":69,"hash":"7eeb0b9dcb35530de412b0aa0ade6b267e2fe22f5e49aa0f3ecf5b9124022a3b"}]}
// mutate4javascript-manifest-end
