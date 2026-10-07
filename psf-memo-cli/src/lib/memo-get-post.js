/*
  Pure helper for the memo-get-post read command.

  The command reads a single stored post document from psf-memo-db. This module
  owns the human-readable summary of its stored fields; the command is a thin
  wiring layer over the shared reporter and the read-only Memo DB client.
*/

// Render the human-readable summary of a stored post.
export function formatGetPostMessage (post = {}) {
  return `${post.txid}: ${post.text} (${post.addr}, block ${post.blockHeight}, seen ${post.seen})`
}

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
