/*
  Pure helper for the memo-reply write command.

  The first multi-field Memo write command. This module owns the 0x6d03 reply
  prefix, the 184-byte reply limit, the parent-txid and reply-text flag
  validation, and the human-readable summary; the command is a thin wiring layer
  over the shared wallet resolver, the broadcast scaffolding, and the reporter.
*/

// Local libraries
import { UsageError } from './reporter.js'
import { parseTxidFlag } from './txid-flag.js'
import { txidToWireBytes } from './wire-encoding.js'

// The 0x6d03 "reply" action prefix.
export const MEMO_REPLY_PREFIX = '6d03'

// The reply payload is limited to 184 UTF-8 bytes after the 32-byte parent txid.
export const MAX_REPLY_BYTES = 184

// Validate the required parent txid and reply text. The parent txid is decoded
// to its 32-byte little-endian wire form here, so a malformed txid is a usage
// error (exit 2) reported before any broadcast. Returns the fields the command
// sends: the wire-form parent bytes and the reply text.
export function parseReplyFlags (flags = {}) {
  const { txid: parent } = parseTxidFlag(flags)

  let parentBytes
  try {
    parentBytes = txidToWireBytes(parent)
  } catch (err) {
    throw new UsageError(err.message)
  }

  const text = flags.memo

  if (text === undefined || text === null) {
    throw new UsageError('You must specify reply text with the -m flag.')
  }

  if (text === '') {
    throw new UsageError('Reply must not be empty.')
  }

  if (Buffer.byteLength(text, 'utf8') > MAX_REPLY_BYTES) {
    throw new UsageError(`Reply is too long. Maximum is ${MAX_REPLY_BYTES} bytes.`)
  }

  return { parentBytes, text }
}

// Render the human-readable success summary: the txid and its explorer link.
export function formatReplyMessage ({ txid, explorerUrl } = {}) {
  return `Posted reply: ${txid}\nView this transaction on a block explorer:\n${explorerUrl}`
}

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
