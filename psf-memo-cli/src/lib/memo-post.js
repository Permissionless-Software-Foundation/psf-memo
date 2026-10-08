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
// {"version":1,"tested_at":"2026-10-07T17:07:35.996Z","module_hash":"8b93ca0d628c1f5ff448ebdae36c933a439209fd8aedfe588ec5649841bb802d","functions":[{"id":"func/parseMemoPostFlags","name":"parseMemoPostFlags","line":22,"end_line":38,"hash":"ca75abe1abb91ba74d04d5be6e5939759ab02524fd804e21f47d15aeac44423f"},{"id":"func/formatMemoPostMessage","name":"formatMemoPostMessage","line":41,"end_line":43,"hash":"aaecb41cc53b521efd94446ef3fdf3d5ea1aa20b0780f84db1896c6d3983fb43"}]}
// mutate4javascript-manifest-end
