/*
  file-check: recover a hosted file's links by payment address.

  A read-only command for the bch-file-hosting POST /files/check-payment route.
  The payment is identified by its address via the required -a flag. A paid
  invoice prints the CID and download/view/gateway links; an unpaid invoice
  prints the amounts received and required plus the quote expiry; an expired
  invoice prints its status. No wallet and no payment. A missing -a flag is a
  usage error (exit 2); an unknown address or an API error is a runtime error
  (exit 1).
*/

// Local libraries
import config from '../../config/index.js'
import { runCommand, UsageError } from '../lib/reporter.js'
import HostingApi from '../lib/hosting-api.js'
import { formatFileCheckMessage } from '../lib/file-check.js'
import { bindMethods } from '../lib/bind-methods.js'

class FileCheck {
  constructor ({
    HostingApiClass = HostingApi,
    config: cfg = config,
    fetchImpl,
    stdout,
    stderr
  } = {}) {
    // Encapsulate dependencies so tests and acceptance can inject a fake API
    // instead of touching the network.
    this.config = cfg
    this.hostingApi = new HostingApiClass({ config: cfg, fetch: fetchImpl })
    this.stdout = stdout
    this.stderr = stderr

    bindMethods(this, ['run', 'validateFlags'])
  }

  // Look up the payment and report it. Returns the exit code (0/1/2) and
  // assigns it to process.exitCode for commander.
  async run (flags = {}) {
    const code = await runCommand(async () => {
      const { address } = this.validateFlags(flags)
      const result = await this.hostingApi.checkPayment({ paymentAddress: address })

      return { message: formatFileCheckMessage(result), data: result }
    }, {
      json: flags.json,
      stdout: this.stdout,
      stderr: this.stderr
    })

    process.exitCode = code
    return code
  }

  // Validate and resolve the required -a address before any request. Throws a
  // UsageError (exit 2) when it is missing.
  validateFlags (flags = {}) {
    if (!flags.address) {
      throw new UsageError('You must specify a payment address with the -a flag.')
    }

    return { address: flags.address }
  }
}

export default FileCheck
