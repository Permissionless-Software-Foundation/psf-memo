/*
  Pure helper for the file-status command.

  The command looks up a hosted file by CID and reports its metadata and pins.
  GET /files/:cid returns no download/view URLs, so this module only renders
  the CID, name, size, status, hosting window, and pins. The command is a thin
  wiring layer over the shared reporter and the hosting API adapter.
*/

// Render the human-readable status. A missing hosting window means the file is
// not paid for yet, so it prints "not paid".
export function formatFileStatusMessage (file = {}) {
  const lines = [`CID: ${file.cid}`]

  if (file.filename !== undefined) {
    lines.push(`File name: ${file.filename}`)
  }

  if (file.sizeBytes !== undefined) {
    lines.push(`Size: ${file.sizeBytes} bytes`)
  }

  lines.push(`Status: ${file.status}`)
  lines.push(`Hosting window: ${file.hostedUntil || 'not paid'}`)

  for (const pin of file.pins || []) {
    lines.push(`Pin: ${pin.provider} ${pin.status}`)
  }

  return lines.join('\n')
}
