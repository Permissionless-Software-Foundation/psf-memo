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
