/*
  Pure helper for the memo-name write command.

  The 0x6d01 set-name command. This module owns the protocol prefix, the
  77-byte limit (UTF-8 bytes, not characters), flag validation, and the
  human-readable summary; the command is a thin wiring layer over the shared
  wallet resolver, the broadcast scaffolding, and the reporter.
*/

// Local libraries
import { memoTextFlagParser } from './memo-text-flag.js'

// The 0x6d01 "set name" action prefix.
export const MEMO_NAME_PREFIX = '6d01'

// The protocol limit is 77 bytes, measured in UTF-8 bytes (memo.cash parity),
// not characters.
export const MAX_NAME_BYTES = 77

// Validate and normalize the -m name text. A missing, empty, or over-long name
// is a usage error so the command exits 2 and names the exact problem.
export const parseMemoNameFlags = memoTextFlagParser({
  field: 'name',
  label: 'Name',
  missingMessage: 'You must specify a name with the -m flag.',
  limit: MAX_NAME_BYTES,
  measure: (text) => Buffer.byteLength(text, 'utf8'),
  unit: 'bytes'
})

// Render the human-readable success summary: the txid and its explorer link.
export function formatMemoNameMessage ({ txid, explorerUrl } = {}) {
  return `Set name: ${txid}\nView this transaction on a block explorer:\n${explorerUrl}`
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T01:53:00.722Z","module_hash":"9e0201c3424b99ebfa76aa56c11822543cd06c72fba36d60ef777357e9e6039b","functions":[{"id":"func/parseMemoNameFlags","name":"parseMemoNameFlags","line":22,"end_line":38,"hash":"7116c0d683f1f30cb14977e4281f56b44e2eac21bb61cfed32e5a4ea542234b4"},{"id":"func/formatMemoNameMessage","name":"formatMemoNameMessage","line":41,"end_line":43,"hash":"9b78cff8dfa2638e813152eab51168c54fe0082c574f0b8a6b5e1f4762f2b550"}]}
// mutate4javascript-manifest-end
