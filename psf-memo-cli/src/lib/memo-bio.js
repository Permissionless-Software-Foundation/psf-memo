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
