/*
  file-host: upload a local file, pay the hosting quote, and confirm it.

  The command reads a local file, POSTs it to the hosting API, pays the quote
  from a resolved wallet (-n <wallet> or --wif <wif>), then polls
  check-payment until the payment confirms. It reports the CID, download/view/
  gateway URLs, and the payment txid. An already-hosted upload short-circuits
  without paying. A missing -f flag or wallet source is a usage error (exit 2)
  with no payment; a missing local file, an API rejection, or an unconfirmed
  payment is a runtime error (exit 1).
*/

// Node libraries
import fs from 'node:fs'
import path from 'node:path'

// Local libraries
import config from '../../config/index.js'
import { runCommand, UsageError } from '../lib/reporter.js'
import HostingApi from '../lib/hosting-api.js'
import { formatFileHostMessage, pollPayment } from '../lib/file-host.js'
import { sendPayment } from '../lib/send-payment.js'
import { resolveWalletSource, validateWalletSource } from '../lib/wallet-source.js'
import WalletUtil from '../lib/wallet-util.js'
import { bindMethods } from '../lib/bind-methods.js'

// The upstream file-host polling defaults: 10 attempts, 3,000 ms apart.
const PAYMENT_CHECK_ATTEMPTS = 10
const PAYMENT_CHECK_DELAY_MS = 3000

class FileHost {
  constructor ({
    HostingApiClass = HostingApi,
    config: cfg = config,
    fetchImpl,
    readFile,
    walletUtil,
    send = sendPayment,
    sleep,
    paymentCheckAttempts = PAYMENT_CHECK_ATTEMPTS,
    paymentCheckDelayMs = PAYMENT_CHECK_DELAY_MS,
    stdout,
    stderr
  } = {}) {
    // Encapsulate dependencies so tests and acceptance can inject a fake API,
    // wallet, file reader, and clock instead of touching the network or disk.
    this.config = cfg
    this.hostingApi = new HostingApiClass({ config: cfg, fetch: fetchImpl })
    this.readFile = readFile || fs.readFileSync
    this.walletUtil = walletUtil || new WalletUtil()
    this.send = send
    this.sleep = sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
    this.paymentCheckAttempts = paymentCheckAttempts
    this.paymentCheckDelayMs = paymentCheckDelayMs
    this.stdout = stdout
    this.stderr = stderr

    bindMethods(this, ['run', 'validateFlags', 'readLocalFile', 'resolveWallet', 'pollForPayment'])
  }

  // Upload, pay, and confirm. Returns the exit code (0/1/2) and assigns it to
  // process.exitCode for commander.
  async run (flags = {}) {
    const code = await runCommand(async () => {
      this.validateFlags(flags)

      const buffer = this.readLocalFile(flags.file)
      const filename = path.basename(flags.file)
      const upload = await this.hostingApi.upload({ filename, buffer })

      if (upload.alreadyHosted) {
        return { message: formatFileHostMessage(upload), data: upload }
      }

      const { wallet } = await this.resolveWallet(flags)
      const txid = await this.send({
        wallet,
        toAddress: upload.paymentAddress,
        amountSats: upload.priceSats
      })

      const paid = await this.pollForPayment(upload.paymentAddress)
      const result = {
        cid: paid.cid,
        downloadUrl: paid.downloadUrl,
        viewUrl: paid.viewUrl,
        gatewayUrls: paid.gatewayUrls || [],
        txid,
        paymentAddress: upload.paymentAddress
      }

      return { message: formatFileHostMessage(result), data: result }
    }, {
      json: flags.json,
      stdout: this.stdout,
      stderr: this.stderr
    })

    process.exitCode = code
    return code
  }

  // Validate the required -f file flag and the wallet source before reading or
  // uploading. Throws a UsageError (exit 2) for a missing flag or an absent or
  // ambiguous wallet source.
  validateFlags (flags = {}) {
    if (!flags.file) {
      throw new UsageError('You must specify a file with the -f flag.')
    }

    return validateWalletSource(flags)
  }

  // Read the local file, mapping any read failure to the documented message.
  readLocalFile (filePath) {
    try {
      return this.readFile(filePath)
    } catch (err) {
      throw new Error(`Cannot read file: ${filePath}`)
    }
  }

  // Resolve the signing wallet from the -n/--wif flags.
  resolveWallet (flags = {}) {
    return resolveWalletSource(
      { name: flags.name, wif: flags.wif },
      { walletUtil: this.walletUtil }
    )
  }

  // Poll check-payment until it reports paid or the attempts are exhausted.
  pollForPayment (paymentAddress) {
    return pollPayment({
      checkPayment: (args) => this.hostingApi.checkPayment(args),
      paymentAddress,
      attempts: this.paymentCheckAttempts,
      delayMs: this.paymentCheckDelayMs,
      sleep: this.sleep
    })
  }
}

export default FileHost
