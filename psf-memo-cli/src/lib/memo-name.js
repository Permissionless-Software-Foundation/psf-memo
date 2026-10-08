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
// {"version":1,"tested_at":"2026-10-08T02:02:06.034Z","module_hash":"c9a0e126f4257e7741d94ad92241e62e3edc5765893336a9ff91badcdd914a72","functions":[{"id":"func/formatMemoNameMessage","name":"formatMemoNameMessage","line":32,"end_line":34,"hash":"9b78cff8dfa2638e813152eab51168c54fe0082c574f0b8a6b5e1f4762f2b550"}]}
// mutate4javascript-manifest-end
