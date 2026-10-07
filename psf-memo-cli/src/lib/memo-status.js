/*
  Pure helper for the memo-status read command.

  The command reports the psf-memo-db indexer's sync state. This module owns the
  human-readable summary; the command is a thin wiring layer over the shared
  reporter and the read-only Memo DB client.
*/

// Render the human-readable indexer status summary.
export function formatStatusMessage (status = {}) {
  return `indexer status: start ${status.startBlockHeight}, synced ${status.syncedBlockHeight}, chain ${status.chainBlockHeight}`
}

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
