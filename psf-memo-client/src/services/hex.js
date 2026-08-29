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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T22:43:42.484Z","module_hash":"7f3445b7df4d792113f2736232f69faee044f71f6b4a5985224615b36909607b","functions":[{"id":"func/hexToBytes","name":"hexToBytes","line":12,"end_line":26,"hash":"dbf7e0a434598f85365f5a60a0ca227a17a1bcd6718a78bb5aaf7afb8eb2487b"},{"id":"func/buildTxidTextPayload","name":"buildTxidTextPayload","line":30,"end_line":37,"hash":"542a47a13d30c845b7ac9a04079d7a131ece3368a604840ffef75adf97b11f7d"}]}
// mutate4javascript-manifest-end
