/*
  Pure helper for the memo-avatar write command.

  The 0x6d0a set-profile-picture command. This module owns the protocol prefix,
  the 217-byte limit (UTF-8 bytes, not characters), flag validation, and the
  human-readable summary; the command is a thin wiring layer over the shared
  wallet resolver, the broadcast scaffolding, and the reporter. Unlike the -m
  profile-text commands, the value comes from the -u flag.
*/

// Local libraries
import { memoTextFlagParser } from './memo-text-flag.js'

// The 0x6d0a "set profile picture" action prefix.
export const MEMO_AVATAR_PREFIX = '6d0a'

// The protocol limit is 217 bytes, measured in UTF-8 bytes, not characters.
export const MAX_AVATAR_BYTES = 217

// Validate and normalize the -u avatar URL. A missing, empty, or over-long URL
// is a usage error so the command exits 2 and names the exact problem.
export const parseMemoAvatarFlags = memoTextFlagParser({
  flag: 'url',
  field: 'url',
  label: 'Avatar URL',
  missingMessage: 'You must specify an avatar URL with the -u flag.',
  limit: MAX_AVATAR_BYTES,
  measure: (text) => Buffer.byteLength(text, 'utf8'),
  unit: 'bytes'
})

// Render the human-readable success summary: the txid and its explorer link.
export function formatMemoAvatarMessage ({ txid, explorerUrl } = {}) {
  return `Set avatar URL: ${txid}\nView this transaction on a block explorer:\n${explorerUrl}`
}
