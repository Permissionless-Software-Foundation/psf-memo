/*
  Pure helper for the memo-name write command.

  The 0x6d01 set-name command. This module owns the protocol prefix, the
  77-byte limit (UTF-8 bytes, not characters), flag validation, and the
  human-readable summary; the command is a thin wiring layer over the shared
  wallet resolver, the broadcast scaffolding, and the reporter.
*/

// Local libraries
import { UsageError } from './reporter.js'

// The 0x6d01 "set name" action prefix.
export const MEMO_NAME_PREFIX = '6d01'

// The protocol limit is 77 bytes, measured in UTF-8 bytes (memo.cash parity),
// not characters.
export const MAX_NAME_BYTES = 77

// Validate and normalize the -m name text. A missing, empty, or over-long name
// is a usage error so the command exits 2 and names the exact problem.
export function parseMemoNameFlags (flags = {}) {
  const name = flags.memo

  if (name === undefined || name === null) {
    throw new UsageError('You must specify a name with the -m flag.')
  }

  if (name === '') {
    throw new UsageError('Name must not be empty.')
  }

  if (Buffer.byteLength(name, 'utf8') > MAX_NAME_BYTES) {
    throw new UsageError(`Name is too long. Maximum is ${MAX_NAME_BYTES} bytes.`)
  }

  return { name }
}

// Render the human-readable success summary: the txid and its explorer link.
export function formatMemoNameMessage ({ txid, explorerUrl } = {}) {
  return `Set name: ${txid}\nView this transaction on a block explorer:\n${explorerUrl}`
}
