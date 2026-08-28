/*
  Hex encoding helpers used by Memo protocol actions.

  A Bitcoin Cash transaction id is a 32-byte value encoded as a 64-character
  hex string. Memo actions like replies and likes need to embed that txid in
  the OP_RETURN payload as raw bytes, so this module provides a small,
  testable conversion helper.
*/

// Decode a hex string into a Uint8Array of the requested byte length.
// The label parameter customizes error messages for the caller's context.
function hexToBytes (hex, byteLength = 32, label = 'Value') {
  if (typeof hex !== 'string' || hex.length !== byteLength * 2) {
    throw new Error(`${label} must be a ${byteLength * 2}-character hex string.`)
  }

  const bytes = new Uint8Array(byteLength)
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.substr(i, 2), 16)
    if (Number.isNaN(byte)) {
      throw new Error(`${label} must be a valid hex string.`)
    }
    bytes[i / 2] = byte
  }
  return bytes
}

// Build the raw OP_RETURN payload for a txid-referencing Memo action: the
// given 32-byte txid followed by a UTF-8 encoded value.
function buildTxidTextPayload (txid, text) {
  const txidBytes = hexToBytes(txid, 32, 'Poll txid')
  const textBytes = new TextEncoder().encode(text)
  const raw = new Uint8Array(txidBytes.length + textBytes.length)
  raw.set(txidBytes, 0)
  raw.set(textBytes, txidBytes.length)
  return raw
}

module.exports = { hexToBytes, buildTxidTextPayload }
