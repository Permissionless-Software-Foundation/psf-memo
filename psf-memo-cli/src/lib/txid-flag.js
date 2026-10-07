/*
  Shared parsing for the required -t txid flag.

  Several Memo read commands identify a post by its transaction id, so both the
  validation and its exact usage message live here rather than being duplicated
  across feature modules.
*/

// Local libraries
import { UsageError } from './reporter.js'

export const TXID_FLAG_ERROR = 'You must specify a post txid with the -t flag.'

// Resolve the required post txid. Throws a UsageError (exit 2) when missing.
export function parseTxidFlag (flags = {}) {
  const txid = flags.txid

  if (!txid) {
    throw new UsageError(TXID_FLAG_ERROR)
  }

  return { txid }
}

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
