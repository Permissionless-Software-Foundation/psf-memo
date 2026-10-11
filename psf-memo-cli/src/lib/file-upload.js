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
    return formatHostedMessage(result)
  }

  return formatQuoteMessage(result)
}

// An already-hosted file exposes only its download and view links.
function formatHostedMessage (result) {
  return [
    `Download URL: ${result.downloadUrl}`,
    `View URL: ${result.viewUrl}`
  ].join('\n')
}

// A price quote lists the priced fields, plus the optional file metadata, the
// billed-size note when billing rounds the size up, and the expiry only when
// the API reports them.
function formatQuoteMessage (result) {
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T16:23:54.049Z","module_hash":"27a94f624046f70ec3a5b2e3304fce6476b11d2dfb0167acd47f4b3b43ee9361","functions":[{"id":"func/formatFileUploadMessage","name":"formatFileUploadMessage","line":14,"end_line":20,"hash":"625a6b186b08958c7c87ec258b0c030bb372b7227da0031f91bb580ec873a820"},{"id":"func/formatHostedMessage","name":"formatHostedMessage","line":23,"end_line":28,"hash":"8b1d6ca35667b7cd249ead5216ebf81ca4af40356f443ac7234c3d2f067b2089"},{"id":"func/formatQuoteMessage","name":"formatQuoteMessage","line":33,"end_line":56,"hash":"23d8b2658819a222e5c58e1bfc4544cf574ed9760362ccf8418280f81f7be607"}]}
// mutate4javascript-manifest-end
