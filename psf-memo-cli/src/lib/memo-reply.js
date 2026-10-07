/*
  Pure helper for the memo-reply write command.

  The first multi-field Memo write command. This module owns the 0x6d03 reply
  prefix, the 184-byte reply limit, the parent-txid and reply-text flag
  validation, and the human-readable summary; the command is a thin wiring layer
  over the shared wallet resolver, the broadcast scaffolding, and the reporter.
*/

// Local libraries
import { UsageError } from './reporter.js'
import { parseTxidBytesFlag } from './txid-flag.js'

// The 0x6d03 "reply" action prefix.
export const MEMO_REPLY_PREFIX = '6d03'

// The reply payload is limited to 184 UTF-8 bytes after the 32-byte parent txid.
export const MAX_REPLY_BYTES = 184

// Validate the required parent txid and reply text. The parent txid is decoded
// to its 32-byte little-endian wire form here, so a malformed txid is a usage
// error (exit 2) reported before any broadcast. Returns the fields the command
// sends: the wire-form parent bytes and the reply text.
export function parseReplyFlags (flags = {}) {
  const parentBytes = parseTxidBytesFlag(flags)

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
// {"version":1,"tested_at":"2026-10-07T18:49:42.288Z","module_hash":"11e500234f21cf0c64b92dc0737902d7de1e0f82b458b90a2d20ce93a940dd1c","functions":[{"id":"func/parseReplyFlags","name":"parseReplyFlags","line":24,"end_line":42,"hash":"1195cb44094f52602b0fa1b66db54369d2c53eca691a8c70ec5ac577b24ded64"},{"id":"func/formatReplyMessage","name":"formatReplyMessage","line":45,"end_line":47,"hash":"c67dbebce6eb635798343949c1937f36cdc49007dcc4e5f03bac3c1c61d28fe1"}]}
// mutate4javascript-manifest-end
