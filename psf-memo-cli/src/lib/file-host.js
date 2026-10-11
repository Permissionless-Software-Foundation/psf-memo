/*
  Pure helpers for the file-host command.

  The command uploads a file, pays the hosting quote from a wallet, then polls
  check-payment until the payment confirms. This module owns the human-readable
  rendering and the injected-poll loop; the command is a thin wiring layer over
  the shared reporter, the hosting API adapter, and the wallet source.
*/

// Local libraries
import { hostedResultLines } from './hosted-result.js'

// Render the human-readable result. An already-hosted file shows only its
// links; a paid result shows the CID, links, gateway links, and payment txid.
export function formatFileHostMessage (result = {}) {
  if (result.alreadyHosted) {
    return [
      `Download URL: ${result.downloadUrl}`,
      `View URL: ${result.viewUrl}`
    ].join('\n')
  }

  const lines = hostedResultLines(result)
  lines.push(`Transaction: ${result.txid}`)

  return lines.join('\n')
}

// Poll check-payment until it reports paid, sleeping between attempts. Throws
// once every attempt is exhausted without a paid result. The clock and the
// check call are injected so tests never sleep or touch the network.
export async function pollPayment ({
  checkPayment,
  paymentAddress,
  attempts,
  delayMs,
  sleep
} = {}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const result = await checkPayment({ paymentAddress })
    if (result.status === 'paid') return result

    if (attempt < attempts - 1) {
      await sleep(delayMs)
    }
  }

  throw new Error('Payment not confirmed.')
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T17:41:45.621Z","module_hash":"81153898b7cdef51885bc683ffdf1a205928ea497cc266fda61c950064209ffd","functions":[{"id":"func/formatFileHostMessage","name":"formatFileHostMessage","line":15,"end_line":27,"hash":"8b6098a81bed65a71f74def993caa72d44f08cead829d5cbc78b8ba16d3b465b"},{"id":"func/pollPayment","name":"pollPayment","line":32,"end_line":49,"hash":"53543d8fd7535d9f25f8b40494d90361000a6d1093d5e470ff441d8a68ded871"}]}
// mutate4javascript-manifest-end
