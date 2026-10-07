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
// {"version":1,"tested_at":"2026-10-07T03:29:09.873Z","module_hash":"32782d73caea44fbe46cc184a53b4cbfdc155d60373eefce8c7c260e0cb27bef","functions":[{"id":"func/parseTxidFlag","name":"parseTxidFlag","line":15,"end_line":23,"hash":"c270e41d8062d0dc1e3042df6c2b09adf2e8978ba54f36bb77cc282574f96a69"}]}
// mutate4javascript-manifest-end
