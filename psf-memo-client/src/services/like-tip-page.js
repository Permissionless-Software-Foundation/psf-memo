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
const { BLOCK_EXPLORER_TX_BASE, blockExplorerTxUrl } = require('./block-explorer')

const SUCCESS_MESSAGE = 'Your like was broadcast to the Bitcoin Cash network.'

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
    // After a broadcast, the like/tip modal stays open and shows the result
    // until the user dismisses it.
    this.showResultModal = false
    this.lastResult = null
  }

  // Open the like/tip modal for a post and check that the wallet has enough
  // spendable balance to cover fees. Returns a result object.
  open (postTxid, authorAddress) {
    this.postTxid = postTxid
    this.authorAddress = authorAddress
    this.modalOpen = true
    this.showResultModal = false
    this.lastResult = null
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

  // Submit the like. A successful broadcast leaves the modal open and shows
  // the broadcast result instead of closing or navigating. Validation and
  // broadcast failures stay on the form.
  async submit () {
    this.showResultModal = false
    this.lastResult = null
    const result = await super.submit()
    this.lastResult = result
    if (result.ok) {
      this.showResultModal = true
      this.modalOpen = true
    }
    return result
  }

  // The broadcast success message shown while the result is visible.
  getBroadcastMessage () {
    if (!this.lastResult || !this.lastResult.ok) return ''
    return SUCCESS_MESSAGE
  }

  // Block explorer URL for a broadcast like transaction.
  explorerUrl (txid) {
    return LikeTipPage.explorerUrl(txid)
  }

  // Dismiss the broadcast result. This closes the like/tip modal.
  dismissResult () {
    this.showResultModal = false
    this.close()
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

LikeTipPage.EXPLORER_TX_BASE = BLOCK_EXPLORER_TX_BASE
LikeTipPage.SUCCESS_MESSAGE = SUCCESS_MESSAGE
LikeTipPage.explorerUrl = blockExplorerTxUrl

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-16T19:21:51.249Z","module_hash":"df3f5a3cd43fba8d3b7267561b21c84b68b964a958b6b77f0fa4b12f3afffc8d","functions":[{"id":"func/LikeTipPage.constructor","name":"LikeTipPage.constructor","line":22,"end_line":35,"hash":"020fe0af9dd6885fb83ad2edc0e94ef5d28661eec2a138fa5576743014341124"},{"id":"func/LikeTipPage.open","name":"LikeTipPage.open","line":39,"end_line":66,"hash":"0bfb69e7e8f6d9fc8ec2c923c20578215e8765088c514f8398461e64108aaaff"},{"id":"func/LikeTipPage.close","name":"LikeTipPage.close","line":69,"end_line":74,"hash":"673843dc179c1a325e224d6ad235f945d14b7efbceefb26f1b1f69dccfa4e535"},{"id":"func/LikeTipPage.setTip","name":"LikeTipPage.setTip","line":78,"end_line":80,"hash":"cfa38ba8b9f799839393de98e83d5512699327d99dbcf3de11d322be3a027323"},{"id":"func/LikeTipPage._setBusy","name":"LikeTipPage._setBusy","line":83,"end_line":85,"hash":"8fe4b97a14cdbd3849bd6bf493738a2caf50f36002de1c96603290b98c83e511"},{"id":"func/LikeTipPage.submit","name":"LikeTipPage.submit","line":90,"end_line":100,"hash":"d7a255241f316400a9c1f30b057ae7c63e27421d76432c8e02ecc88121319982"},{"id":"func/LikeTipPage.getBroadcastMessage","name":"LikeTipPage.getBroadcastMessage","line":103,"end_line":106,"hash":"800d20ba3a50dcffcee063bc5cd6422b548713520530b3d159cf1980310000b2"},{"id":"func/LikeTipPage.explorerUrl","name":"LikeTipPage.explorerUrl","line":109,"end_line":111,"hash":"7822bf8055c5fc45eaa46919b8665c8954def38f92bed94b091796a6a9b5381d"},{"id":"func/LikeTipPage.dismissResult","name":"LikeTipPage.dismissResult","line":114,"end_line":117,"hash":"96d1421749b8e3a3c295ad071d4bd921d17edd7c5e8824b1b3c3196b009cfcab"},{"id":"func/LikeTipPage._parseTip","name":"LikeTipPage._parseTip","line":120,"end_line":128,"hash":"7db17db65fe02da8db7d4658aa2fc38d52f61754c6e3a92cca5db6ebcf8eda5a"},{"id":"func/LikeTipPage._perform","name":"LikeTipPage._perform","line":131,"end_line":137,"hash":"f6af26bbf3965455c3436dd1da28bf22e27b65d28d4e02a9fe423a909efca030"},{"id":"func/LikeTipPage._handleSubmitFailure","name":"LikeTipPage._handleSubmitFailure","line":141,"end_line":144,"hash":"a66731eb7050a3c87ff7d228de3661facb9c971e7611d7953f86ba1b88bb1110"}]}
// mutate4javascript-manifest-end
