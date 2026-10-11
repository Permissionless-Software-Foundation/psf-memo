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
import { createHostingCommand } from '../lib/hosting-command.js'
import { formatFileCheckMessage } from '../lib/file-check.js'

const ADDRESS_FLAG_ERROR = 'You must specify a payment address with the -a flag.'

export default createHostingCommand({
  flag: { name: 'address', message: ADDRESS_FLAG_ERROR },
  lookup: (hostingApi, { address }) => hostingApi.checkPayment({ paymentAddress: address }),
  format: formatFileCheckMessage
})

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T17:39:09.200Z","module_hash":"3d655193d9319940608aa16b8d1972034cdd9ae9f6e07d7a7632f64f9fdf315c","functions":[]}
// mutate4javascript-manifest-end
