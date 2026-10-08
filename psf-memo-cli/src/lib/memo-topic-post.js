/*
  Pure helper for the memo-topic-post write command.

  The 0x6d0c topic-message command. This module owns the protocol prefix, the
  combined room + message limit of 214 UTF-8 bytes (not characters), flag
  validation, and the human-readable summary; the command is a thin wiring layer
  over the shared wallet resolver, the multi-push broadcast scaffolding, and the
  reporter.
*/

// Local libraries
import { UsageError } from './reporter.js'
import { parseRoomFlag } from './room-flag.js'

// The 0x6d0c "topic message" action prefix.
export const MEMO_TOPIC_POST_PREFIX = '6d0c'

// The room plus message payload is limited to 214 UTF-8 bytes.
export const MAX_TOPIC_MESSAGE_BYTES = 214

// Validate and normalize the -r room and -m message. A missing room or message,
// or a room plus message over the combined byte limit, is a usage error so the
// command exits 2 and names the exact problem.
export function parseTopicPostFlags (flags = {}) {
  const room = parseRoomFlag(flags)
  const message = flags.memo

  if (message === undefined || message === null) {
    throw new UsageError('You must specify topic message text with the -m flag.')
  }

  if (message === '') {
    throw new UsageError('Topic message must not be empty.')
  }

  const bytes = Buffer.byteLength(room, 'utf8') + Buffer.byteLength(message, 'utf8')
  if (bytes > MAX_TOPIC_MESSAGE_BYTES) {
    throw new UsageError(`Topic message is too long. Maximum is ${MAX_TOPIC_MESSAGE_BYTES} bytes.`)
  }

  return { room, message }
}

// Render the human-readable success summary: the txid and its explorer link.
export function formatTopicPostMessage ({ txid, explorerUrl } = {}) {
  return `Posted topic message: ${txid}\nView this transaction on a block explorer:\n${explorerUrl}`
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:56:18.433Z","module_hash":"3e05547310b627fe56a16c9aace40fd5014e5e7141c01adf3cd89540c28caa24","functions":[{"id":"func/parseTopicPostFlags","name":"parseTopicPostFlags","line":24,"end_line":42,"hash":"df0a332204bf87b7b415200189a8cdd01df1480ab3687c07e1382a899e7fe4df"},{"id":"func/formatTopicPostMessage","name":"formatTopicPostMessage","line":45,"end_line":47,"hash":"0485d2b9614456e696379c0fac29ab9ad586c4f950e926990e90107223550e8c"}]}
// mutate4javascript-manifest-end
