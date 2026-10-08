/*
  memo-reply: broadcast a 0x6d03 Memo reply.

  The first multi-field write command. It resolves the signing wallet
  (-n <wallet> or --wif <wif>), requires the parent post txid (-t), validates
  the reply text against the 0x6d03 limit of 184 UTF-8 bytes, broadcasts the
  two-field Memo action [6d03, parent txid (32 LE), text] through the shared
  multi-push scaffolding, and reports the transaction id plus its
  bch.loping.net explorer link. A missing or malformed flag is a usage error
  (exit 2); a rejected broadcast surfaces the wallet's real error (exit 1).
*/

// Local libraries
import {
  parseReplyFlags,
  formatReplyMessage,
  MEMO_REPLY_PREFIX
} from '../lib/memo-reply.js'
import { defineFieldsWriteCommand } from '../lib/write-command.js'

const MemoReply = defineFieldsWriteCommand({
  parse: parseReplyFlags,
  format: formatReplyMessage,
  prefix: MEMO_REPLY_PREFIX,
  fields: ['parentBytes', 'text']
})

export default MemoReply

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:46:41.263Z","module_hash":"3bdb6ca966646e4aaa4768e80aa65bd7a74440519efce639564178fc92d70588","functions":[]}
// mutate4javascript-manifest-end
