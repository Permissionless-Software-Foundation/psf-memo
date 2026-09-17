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

// Decode a 32-byte txid and reverse it into Memo protocol wire order. Bitcoin
// txids are displayed big-endian but embedded in OP_RETURN payloads as
// little-endian bytes, so callers pass the display hex and receive the wire
// bytes.
function txidToWireBytes (txid, label = 'Value') {
  return hexToBytes(txid, 32, label).reverse()
}

// Build the separate OP_RETURN pushes for a txid-referencing Memo action:
// the referenced txid in little-endian wire order and the UTF-8 encoded value,
// each as its own push. The label customizes the invalid-txid error message.
function buildTxidTextPushes (txid, text, label = 'Poll txid') {
  const txidBytes = txidToWireBytes(txid, label)
  const textBytes = new TextEncoder().encode(text)
  return [txidBytes, textBytes]
}

module.exports = { hexToBytes, txidToWireBytes, buildTxidTextPushes }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-16T22:01:27.280Z","module_hash":"454b45f3ce08c5ea6346c113db6384f7a44dddbd21e2fb0a35c41ce6701e62c8","functions":[{"id":"func/hexToBytes","name":"hexToBytes","line":12,"end_line":26,"hash":"dbf7e0a434598f85365f5a60a0ca227a17a1bcd6718a78bb5aaf7afb8eb2487b"},{"id":"func/txidToWireBytes","name":"txidToWireBytes","line":32,"end_line":34,"hash":"ac25753fecb32c929134b6e6379cae0bfddd4aa6f7ae438a08da650450e9ea1a"},{"id":"func/buildTxidTextPayload","name":"buildTxidTextPayload","line":39,"end_line":46,"hash":"068504ea13a037adabbbfeab122fb5ec6113625a9e0b009cbbe8b46b6bebdaee"}]}
// mutate4javascript-manifest-end
