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
import { readLocalFile } from '../lib/read-local-file.js'
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

    bindMethods(this, ['run', 'validateFlags', 'resolveWallet', 'pollForPayment'])
  }

  // Upload, pay, and confirm. Returns the exit code (0/1/2) and assigns it to
  // process.exitCode for commander.
  async run (flags = {}) {
    const code = await runCommand(async () => {
      this.validateFlags(flags)

      const buffer = readLocalFile(this.readFile, flags.file)
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T17:21:03.402Z","module_hash":"c4ea9a6638376c6ce0282fb09c6bea3fba43e5f386e77546594873ae3f8dea81","functions":[{"id":"func/FileHost.constructor","name":"FileHost.constructor","line":33,"end_line":60,"hash":"af6b5d81abe0db37431db98b2d5c0a2add393f65ad86719dcf793c21b503b3ec"},{"id":"func/FileHost.run","name":"FileHost.run","line":64,"end_line":102,"hash":"b6fcd86f931543285e06373cff6b6f8cb3c409f3eda5761975a55660b495b043"},{"id":"func/FileHost.validateFlags","name":"FileHost.validateFlags","line":107,"end_line":113,"hash":"7de071443c88c433b243cad4443413d5ad470e99598bf35f75c509ddc1e4d6a8"},{"id":"func/FileHost.resolveWallet","name":"FileHost.resolveWallet","line":116,"end_line":121,"hash":"80b02e9f7513db966e67e53e2ddc70cf91c01e0a84f3c986da472c506f8f9851"},{"id":"func/FileHost.pollForPayment","name":"FileHost.pollForPayment","line":124,"end_line":132,"hash":"9a2a7385c31bf403a0b3d90b38db38d3b8a5ca3344bc944b27ff61a3ff9c050d"}]}
// mutate4javascript-manifest-end
