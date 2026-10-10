/*
  Page-controller service for the file-hosting upload view.

  The service owns the page's display state. It turns a chosen browser file and
  the hosting API response into one of these states:

    no-file   the visitor submitted the form without choosing a file
    quote     the API returned a price and a payment address
    hosted    the API reported the file is already hosted (download link)
    paid      check-payment reported the quote paid (CID, links, transaction)
    expired   the quote expired before the payment was confirmed
    pending   the payment was never confirmed within the polling window
    error     the upload or the wallet payment was rejected

  It also pays an open quote from the injected wallet and polls check-payment
  until the payment is confirmed. `now` and `sleep` are injected so the state
  transitions are deterministic and testable. The state is a plain view model
  that the presentational component and the acceptance run can render without
  a browser.
*/

const { formatCountdown } = require('./quote-countdown')
const { failureMessage } = require('./errors')

const NO_FILE_MESSAGE = 'Choose a file to upload.'
const GENERIC_ERROR_MESSAGE = 'Upload failed'
const EXPIRED_MESSAGE = 'This quote has expired.'
const PENDING_MESSAGE = 'Payment not confirmed.'
const DEFAULT_CONFIRMATION_ATTEMPTS = 10
const DEFAULT_POLL_DELAY_MS = 3000

// Normalize an optional byte count from the API. `undefined` and `null` mean
// "not reported"; any other value is coerced to a number so the view model
// carries only numbers.
function optionalNumber (value) {
  if (value === undefined || value === null) return undefined
  return Number(value)
}

function quoteState (response, filename, now) {
  const state = {
    status: 'quote',
    filename: response.filename || filename,
    priceSats: Number(response.priceSats),
    paymentAddress: response.paymentAddress
  }

  // The API reports the selected file size and the billed size separately. A
  // size is kept only when the API reported it; the view shows a separate
  // billed line only when billing rounded the size up.
  const sizeBytes = optionalNumber(response.sizeBytes)
  if (sizeBytes !== undefined) state.sizeBytes = sizeBytes
  const billedBytes = optionalNumber(response.billedBytes)
  if (billedBytes !== undefined) state.billedBytes = billedBytes

  // A quote that carries an expiry gets a stable countdown label. Quotes
  // without one (for example an already-hosted response) render no countdown.
  if (response.quoteExpiresAt) {
    state.quoteExpiresAt = response.quoteExpiresAt
    state.countdown = formatCountdown(Date.parse(response.quoteExpiresAt) - now)
  }

  return state
}

function hostedState (response, filename) {
  return {
    status: 'hosted',
    filename: response.filename || filename,
    downloadUrl: response.downloadUrl
  }
}

function paidState (response, txid) {
  return {
    status: 'paid',
    filename: response.filename,
    cid: response.cid,
    downloadUrl: response.downloadUrl,
    gatewayUrls: response.gatewayUrls || [],
    txid
  }
}

// Map a successful API response to the page state. An already-hosted file has
// no new quote; everything else is a fresh quote.
function resultState (response, filename, now) {
  if (response && response.alreadyHosted) return hostedState(response, filename)
  return quoteState(response, filename, now)
}

function errorState (err, filename) {
  return { status: 'error', filename, message: failureMessage(err, GENERIC_ERROR_MESSAGE) }
}

// A wallet payment must yield a non-empty transaction id; anything else is a
// wallet failure and is surfaced as the page error state.
function requireTxid (txid) {
  if (typeof txid !== 'string' || !txid) {
    throw new Error('Unexpected transaction id from wallet')
  }
  return txid
}

class FileUploadPage {
  constructor ({
    hostingApi,
    wallet,
    now = Date.now,
    sleep,
    maxConfirmations = DEFAULT_CONFIRMATION_ATTEMPTS,
    pollDelayMs = DEFAULT_POLL_DELAY_MS
  } = {}) {
    if (!hostingApi) throw new Error('FileUploadPage requires a hosting API adapter')

    this.hostingApi = hostingApi
    this.wallet = wallet
    this.now = now
    this.sleep = sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
    this.maxConfirmations = maxConfirmations
    this.pollDelayMs = pollDelayMs
    this.state = { status: 'idle' }
    this.quote = null
    this.txid = null

    this.upload = this.upload.bind(this)
    this.payFromWallet = this.payFromWallet.bind(this)
    this.waitForConfirmation = this.waitForConfirmation.bind(this)
    this.getViewModel = this.getViewModel.bind(this)
  }

  // Upload a browser File (or null when no file was chosen) and resolve to the
  // page display state.
  async upload (file) {
    if (!file) {
      this.state = { status: 'no-file', message: NO_FILE_MESSAGE }
      this.quote = null
      return this.state
    }

    try {
      const response = await this.hostingApi.upload(file)
      this.state = resultState(response, file.name, this.now())
    } catch (err) {
      this.state = errorState(err, file.name)
    }

    this.quote = this.state.status === 'quote' ? this.state : null
    return this.state
  }

  // Pay the open quote from the browser wallet. Returns the transaction id, or
  // null (leaving the error state) when the wallet rejects the payment.
  async payFromWallet () {
    if (!this.wallet) throw new Error('FileUploadPage requires a wallet to pay')
    if (!this.quote) throw new Error('There is no open quote to pay')

    try {
      this.txid = requireTxid(await this.wallet.send({
        address: this.quote.paymentAddress,
        amountSats: this.quote.priceSats
      }))
      return this.txid
    } catch (err) {
      this.state = errorState(err, this.quote.filename)
      return null
    }
  }

  // One poll of check-payment. Resolves to a terminal state when the check
  // reports paid or expired, or rejects, and to null when the payment is not
  // visible yet.
  async pollOnce () {
    let result
    try {
      result = await this.hostingApi.checkPayment({ paymentAddress: this.quote.paymentAddress })
    } catch (err) {
      return errorState(err, this.quote.filename)
    }

    if (result.status === 'paid') return paidState(result, this.txid)
    if (result.status === 'expired') return { status: 'expired', message: EXPIRED_MESSAGE }
    return null
  }

  // Poll check-payment until it reports paid or expired. A rejected check (an
  // HTTP or network error) shows the API error and stops polling. If the
  // payment never confirms within the polling window, the page shows the
  // pending message.
  async waitForConfirmation () {
    if (!this.quote) throw new Error('There is no open quote to confirm')

    for (let attempt = 0; attempt < this.maxConfirmations; attempt++) {
      const terminal = await this.pollOnce()
      if (terminal) {
        this.state = terminal
        return this.state
      }

      if (attempt < this.maxConfirmations - 1) await this.sleep(this.pollDelayMs)
    }

    this.state = { status: 'pending', message: PENDING_MESSAGE }
    return this.state
  }

  getViewModel () {
    return this.state
  }
}

module.exports = FileUploadPage
module.exports.NO_FILE_MESSAGE = NO_FILE_MESSAGE
module.exports.EXPIRED_MESSAGE = EXPIRED_MESSAGE
module.exports.PENDING_MESSAGE = PENDING_MESSAGE
