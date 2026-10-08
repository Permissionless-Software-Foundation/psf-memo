/*
  Pure helper for the memo-bio write command.

  The 0x6d05 set-profile-text command. This module owns the protocol prefix, the
  217-byte limit (UTF-8 bytes, not characters), flag validation, and the
  human-readable summary; the command is a thin wiring layer over the shared
  wallet resolver, the broadcast scaffolding, and the reporter.
*/

// Local libraries
import { UsageError } from './reporter.js'

// The 0x6d05 "set profile text" action prefix.
export const MEMO_BIO_PREFIX = '6d05'

// The protocol limit is 217 bytes, measured in UTF-8 bytes, not characters.
export const MAX_BIO_BYTES = 217

// Validate and normalize the -m bio text. A missing, empty, or over-long bio is
// a usage error so the command exits 2 and names the exact problem.
export function parseMemoBioFlags (flags = {}) {
  const bio = flags.memo

  if (bio === undefined || bio === null) {
    throw new UsageError('You must specify bio text with the -m flag.')
  }

  if (bio === '') {
    throw new UsageError('Bio must not be empty.')
  }

  if (Buffer.byteLength(bio, 'utf8') > MAX_BIO_BYTES) {
    throw new UsageError(`Bio is too long. Maximum is ${MAX_BIO_BYTES} bytes.`)
  }

  return { bio }
}

// Render the human-readable success summary: the txid and its explorer link.
export function formatMemoBioMessage ({ txid, explorerUrl } = {}) {
  return `Set bio: ${txid}\nView this transaction on a block explorer:\n${explorerUrl}`
}
