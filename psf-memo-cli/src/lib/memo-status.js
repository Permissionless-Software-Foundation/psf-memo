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
// {"version":1,"tested_at":"2026-10-08T14:55:26.316Z","module_hash":"7e2436277fc4c7e82270c9e69aaa1d299b82287c3e03c4dd84149187c4243155","functions":[{"id":"func/formatStatusMessage","name":"formatStatusMessage","line":10,"end_line":12,"hash":"f94e1c909931a0263464070656774f2996e9768ee4ccbd47bcbf47d9000d04dc"}]}
// mutate4javascript-manifest-end
