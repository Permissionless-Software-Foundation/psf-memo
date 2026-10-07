/*
  Memo protocol wire-encoding helpers.

  A Bitcoin Cash transaction id is a 32-byte value shown as a 64-character
  big-endian hex string, but Memo actions embed it in an OP_RETURN payload in
  little-endian wire order. A cash address is embedded as its 20-byte hash160 in
  display order -- and is NOT byte-reversed. Malformed txids and addresses are
  rejected with a clear error.
*/

// Global npm libraries
import cashaddr from 'ecashaddrjs'

// Decode a display txid into its 32 little-endian wire bytes.
export function txidToWireBytes (txid) {
  if (typeof txid !== 'string' || txid.length !== 64) {
    throw new Error('Txid must be a 64-character hex string.')
  }

  const bytes = Buffer.from(txid, 'hex')
  if (bytes.length !== 32) {
    throw new Error('Txid must be a valid hex string.')
  }

  return bytes.reverse()
}

// Decode a cash address into its 20-byte hash160 payload, in display order.
export function addressToHash160 (addr) {
  try {
    return Buffer.from(cashaddr.decode(addr).hash)
  } catch (err) {
    throw new Error('Address must be a valid cash address.')
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-07T00:10:48.498Z","module_hash":"609b1128ce1b0e5a1e0c9dc4ec74bd294406bfb72155a565f28958df916c0277","functions":[{"id":"func/txidToWireBytes","name":"txidToWireBytes","line":15,"end_line":26,"hash":"9fff7b807e7704c78c9293ae3a0d71beccf2a6232b545c049421174c636d249c"},{"id":"func/addressToHash160","name":"addressToHash160","line":29,"end_line":35,"hash":"dc7a0d5f33b6796750ff16af6ea2d73589cc1cb70360abdc49ebecc9d2ab2001"}]}
// mutate4javascript-manifest-end
