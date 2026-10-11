/*
  Pure helper for the file-upload command.

  The command uploads a local file to the hosting API and reports either the
  price quote (file name, size, billed size when it differs, price, payment
  address, and expiry) or the already-hosted download/view links. This module
  owns the human-readable rendering; the command is a thin wiring layer over
  the shared reporter and the hosting API adapter.
*/

// Render the human-readable result. An already-hosted file shows its links; a
// quote shows the priced fields, and the billed size only when billing rounds
// the size up.
export function formatFileUploadMessage (result = {}) {
  if (result.alreadyHosted) {
    return [
      `Download URL: ${result.downloadUrl}`,
      `View URL: ${result.viewUrl}`
    ].join('\n')
  }

  const lines = []

  if (result.filename !== undefined) {
    lines.push(`File name: ${result.filename}`)
  }

  if (result.sizeBytes !== undefined) {
    lines.push(`Size: ${result.sizeBytes} bytes`)
  }

  if (result.billedBytes !== undefined && result.billedBytes !== result.sizeBytes) {
    lines.push(`Billed size: ${result.billedBytes} bytes`)
  }

  lines.push(`Price: ${result.priceSats} satoshis`)
  lines.push(`Payment address: ${result.paymentAddress}`)

  if (result.quoteExpiresAt) {
    lines.push(`Quote expires: ${result.quoteExpiresAt}`)
  }

  return lines.join('\n')
}
