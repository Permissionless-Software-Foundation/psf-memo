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
// {"version":1,"tested_at":"2026-10-07T03:29:20.268Z","module_hash":"516535b857cf323f524dc0d6b8293fb911f5e229b51ef6917724206363de44d1","functions":[{"id":"func/formatGetPostMessage","name":"formatGetPostMessage","line":10,"end_line":12,"hash":"22d1292701e4c5f5c1c52d9c890d41329652cca453b4278c219fec661ad03a6c"}]}
// mutate4javascript-manifest-end
