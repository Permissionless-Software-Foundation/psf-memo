/*
  Pure helper for the memo-post write command.

  The first 0x6d02 post command. This module owns the protocol prefix, the
  217-character limit (UTF-16 code units, not bytes), flag validation, and the
  human-readable summary; the command is a thin wiring layer over the shared
  wallet resolver, the broadcast scaffolding, and the reporter.
*/

// Local libraries
import { memoTextFlagParser } from './memo-text-flag.js'

// The 0x6d02 "post memo" action prefix.
export const MEMO_POST_PREFIX = '6d02'

// The protocol limit is 217 characters, measured in UTF-16 code units (the
// JavaScript string length), not UTF-8 bytes.
export const MAX_MEMO_CHARS = 217

// Validate and normalize the -m memo text. A missing, empty, or over-long memo
// is a usage error so the command exits 2 and names the exact problem.
export const parseMemoPostFlags = memoTextFlagParser({
  field: 'memo',
  label: 'Memo',
  missingMessage: 'You must specify memo text with the -m flag.',
  limit: MAX_MEMO_CHARS,
  measure: (text) => text.length,
  unit: 'characters'
})

// Render the human-readable success summary: the txid and its explorer link.
export function formatMemoPostMessage ({ txid, explorerUrl } = {}) {
  return `Posted memo: ${txid}\nView this transaction on a block explorer:\n${explorerUrl}`
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T02:02:16.434Z","module_hash":"2586d39ba16da08146feb73624926d76ddfcb39d82d88af9190494eb589d7630","functions":[{"id":"func/formatMemoPostMessage","name":"formatMemoPostMessage","line":32,"end_line":34,"hash":"aaecb41cc53b521efd94446ef3fdf3d5ea1aa20b0780f84db1896c6d3983fb43"}]}
// mutate4javascript-manifest-end
