/*
  Shared parsing for the required -t txid flag.

  Several Memo read commands identify a post by its transaction id, so both the
  validation and its exact usage message live here rather than being duplicated
  across feature modules.
*/

// Local libraries
import { UsageError } from './reporter.js'
import { txidToWireBytes } from './wire-encoding.js'

export const TXID_FLAG_ERROR = 'You must specify a post txid with the -t flag.'

// Resolve the required post txid. Throws a UsageError (exit 2) when missing.
export function parseTxidFlag (flags = {}) {
  const txid = flags.txid

  if (!txid) {
    throw new UsageError(TXID_FLAG_ERROR)
  }

  return { txid }
}

// Resolve the required post txid and decode it to its 32-byte little-endian
// wire form. A malformed txid is a UsageError, so it is reported before any
// broadcast.
export function parseTxidBytesFlag (flags = {}) {
  const { txid } = parseTxidFlag(flags)

  try {
    return txidToWireBytes(txid)
  } catch (err) {
    throw new UsageError(err.message)
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-07T18:49:31.954Z","module_hash":"41743cf42bab64f7a9e5360fec3ff406e06b3dcd90857e1a1bc65c729c33fe1b","functions":[{"id":"func/parseTxidFlag","name":"parseTxidFlag","line":16,"end_line":24,"hash":"c270e41d8062d0dc1e3042df6c2b09adf2e8978ba54f36bb77cc282574f96a69"},{"id":"func/parseTxidBytesFlag","name":"parseTxidBytesFlag","line":29,"end_line":37,"hash":"368713be89b0d3398ea00de3f70969e64d26b365c736aba0ad6e98c2277e71f3"}]}
// mutate4javascript-manifest-end
