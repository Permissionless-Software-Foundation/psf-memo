/*
  Pure helper for the memo-bio write command.

  The 0x6d05 set-profile-text command. This module owns the protocol prefix, the
  217-byte limit (UTF-8 bytes, not characters), flag validation, and the
  human-readable summary; the command is a thin wiring layer over the shared
  wallet resolver, the broadcast scaffolding, and the reporter.
*/

// Local libraries
import { memoTextFlagParser } from './memo-text-flag.js'

// The 0x6d05 "set profile text" action prefix.
export const MEMO_BIO_PREFIX = '6d05'

// The protocol limit is 217 bytes, measured in UTF-8 bytes, not characters.
export const MAX_BIO_BYTES = 217

// Validate and normalize the -m bio text. A missing, empty, or over-long bio is
// a usage error so the command exits 2 and names the exact problem.
export const parseMemoBioFlags = memoTextFlagParser({
  field: 'bio',
  label: 'Bio',
  missingMessage: 'You must specify bio text with the -m flag.',
  limit: MAX_BIO_BYTES,
  measure: (text) => Buffer.byteLength(text, 'utf8'),
  unit: 'bytes'
})

// Render the human-readable success summary: the txid and its explorer link.
export function formatMemoBioMessage ({ txid, explorerUrl } = {}) {
  return `Set bio: ${txid}\nView this transaction on a block explorer:\n${explorerUrl}`
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T02:01:44.707Z","module_hash":"17f02e9ccfa764b51aeff1fb6257563ac39fa5af1879acedf71105949aa9ecc7","functions":[{"id":"func/formatMemoBioMessage","name":"formatMemoBioMessage","line":31,"end_line":33,"hash":"7af8b0a2d2b6cc07e2b47eed20705c88556eef4ea32c9b24558b8066f0ecc2fb"}]}
// mutate4javascript-manifest-end
