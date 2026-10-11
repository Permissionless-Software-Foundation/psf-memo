/*
  Pure helper for the file-check command.

  The command looks up a hosting payment by address and reports the result.
  A paid invoice carries the CID and links a caller needs to recover a hosted
  file; an unpaid invoice carries the amounts received/required and the quote
  expiry; an expired invoice is just its status. This module owns the
  human-readable rendering; the command is a thin wiring layer over the shared
  reporter and the hosting API adapter.
*/

export function formatFileCheckMessage (result = {}) {
  if (result.status === 'paid') {
    return formatPaidMessage(result)
  }

  if (result.status === 'unpaid') {
    return formatUnpaidMessage(result)
  }

  return `Status: ${result.status}`
}

// A paid invoice exposes its CID, download/view links, and gateway links.
function formatPaidMessage (result) {
  const lines = [
    `CID: ${result.cid}`,
    `Download URL: ${result.downloadUrl}`,
    `View URL: ${result.viewUrl}`
  ]

  for (const url of result.gatewayUrls || []) {
    lines.push(`Gateway URL: ${url}`)
  }

  return lines.join('\n')
}

// An unpaid invoice shows how much has been received, how much is required,
// and when the quote expires.
function formatUnpaidMessage (result) {
  return [
    'Status: unpaid',
    `Received: ${result.receivedSats} satoshis`,
    `Required: ${result.requiredSats} satoshis`,
    `Quote expires: ${result.quoteExpiresAt}`
  ].join('\n')
}
