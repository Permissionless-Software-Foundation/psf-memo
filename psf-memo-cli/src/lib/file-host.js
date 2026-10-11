/*
  Pure helpers for the file-host command.

  The command uploads a file, pays the hosting quote from a wallet, then polls
  check-payment until the payment confirms. This module owns the human-readable
  rendering and the injected-poll loop; the command is a thin wiring layer over
  the shared reporter, the hosting API adapter, and the wallet source.
*/

// Render the human-readable result. An already-hosted file shows only its
// links; a paid result shows the CID, links, gateway links, and payment txid.
export function formatFileHostMessage (result = {}) {
  if (result.alreadyHosted) {
    return [
      `Download URL: ${result.downloadUrl}`,
      `View URL: ${result.viewUrl}`
    ].join('\n')
  }

  const lines = [
    `CID: ${result.cid}`,
    `Download URL: ${result.downloadUrl}`,
    `View URL: ${result.viewUrl}`
  ]

  for (const url of result.gatewayUrls || []) {
    lines.push(`Gateway URL: ${url}`)
  }

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
// {"version":1,"tested_at":"2026-10-11T17:16:56.007Z","module_hash":"2b62aab61238bf7246ff18cebbac61f533b53d40991cd7a104a52cb0f3f7396d","functions":[{"id":"func/formatFileHostMessage","name":"formatFileHostMessage","line":12,"end_line":33,"hash":"1f2219df944ffbddb6f0317575c8da96486ef9513996752c72d3ff59064f7a71"},{"id":"func/pollPayment","name":"pollPayment","line":38,"end_line":55,"hash":"53543d8fd7535d9f25f8b40494d90361000a6d1093d5e470ff441d8a68ded871"}]}
// mutate4javascript-manifest-end
