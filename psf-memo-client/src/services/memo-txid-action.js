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
}

module.exports = MemoTxidAction
