/*
  Like / Tip page behavior: open a modal for a post, validate an optional tip,
  and submit a Memo like (0x6d04) with or without a tip.

  This is the testable controller behind the React like/tip modal. It wraps
  the Memo like behavior (src/services/memo-like.js) and adds page-level
  concerns: holding the target post txid, holding the tip input as a string,
  surfacing validation/dust/maximum/balance errors, and closing the modal on
  success or cancellation.

  The memoLike and modal state concerns are injected so this module stays free
  of UI/network concerns; environmentally unsuitable I/O lives behind those
  small adapter boundaries.
*/

const PageController = require('./page-controller')

class LikeTipPage extends PageController {
  constructor (deps = {}) {
    super(deps)
    this.memoLike = deps.memoLike || null
    this.tipping = false
    this.modalOpen = false
    this.postTxid = deps.postTxid || null
    this.authorAddress = deps.authorAddress || ''
    this.successPath = null
    this.validationCodes = ['like_validation', 'like_dust', 'like_maximum', 'like_balance', 'like_empty_balance']
  }

  // Open the like/tip modal for a post and check that the wallet has enough
  // spendable balance to cover fees. Returns a result object.
  open (postTxid, authorAddress) {
    this.postTxid = postTxid
    this.authorAddress = authorAddress
    this.modalOpen = true
    this.submitError = null
    this.broadcastError = null

    if (!this.memoLike) {
      this.submitError = 'like_validation'
      this.broadcastError = 'Like requires a memo like handler.'
      return { ok: false, error: this.submitError, message: this.broadcastError }
    }

    try {
      const spendable = this.memoLike.getSpendableSats()
      if (spendable < this.memoLike.dustLimit) {
        const err = new Error('add BCH to your wallet before liking a post.')
        err.code = 'like_empty_balance'
        throw err
      }
    } catch (err) {
      return this._handleSubmitFailure(err)
    }

    return { ok: true }
  }

  // Close the modal and reset input/errors.
  close () {
    this.modalOpen = false
    this.submitError = null
    this.broadcastError = null
    this.input = ''
  }

  // Set the tip amount as a raw string. The string form is validated on submit
  // so non-numeric or decimal input can be rejected.
  setTip (tipStr) {
    this.setInput(tipStr)
  }

  // Set the in-flight tipping flag.
  _setBusy (value) {
    this.tipping = value
  }

  // Parse a non-empty tip string into an integer number of satoshis.
  _parseTip (input) {
    if (input === '' || input === null || input === undefined) return 0
    if (!/^\d+$/.test(String(input))) {
      const err = new Error('Tip must be a valid number of satoshis.')
      err.code = 'like_validation'
      throw err
    }
    return parseInt(input, 10)
  }

  // Run the memo like action for the current post and tip.
  async _perform (input) {
    if (!this.memoLike) {
      throw new Error('Like requires a memo like handler.')
    }
    const tipSats = this._parseTip(input)
    return this.memoLike.like(this.postTxid, tipSats, this.authorAddress)
  }

  // Surface the real error message for every failure, including local
  // validation failures, so the like/tip modal can display it.
  _handleSubmitFailure (err) {
    this.broadcastError = err.message || String(err)
    return super._handleSubmitFailure(err)
  }
}

module.exports = LikeTipPage
