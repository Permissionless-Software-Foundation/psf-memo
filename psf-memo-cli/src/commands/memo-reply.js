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
// {"version":1,"tested_at":"2026-10-07T18:26:51.141Z","module_hash":"c83754cfe698868c709b6ddeff19164bf069c0acc1d1796ca9ec1b9c4cd046a8","functions":[{"id":"func/MemoReply.constructor","name":"MemoReply.constructor","line":22,"end_line":24,"hash":"10718fa44618a6c0f6b3ec5b4a8283630b46666f3db9383015d681b3819c2eb7"},{"id":"func/MemoReply.run","name":"MemoReply.run","line":28,"end_line":35,"hash":"b35d599ece6077a13c9bcc233b309f2887a9497a4039c08808952cf62183a282"},{"id":"func/MemoReply.validateFlags","name":"MemoReply.validateFlags","line":39,"end_line":42,"hash":"70221621d67d5da1f5ef916f011d5be73c8bd0146eabb3e3ce1ee461f2c78cc8"},{"id":"func/MemoReply.post","name":"MemoReply.post","line":45,"end_line":51,"hash":"4cdd076b87889d0732d6fad81af158a74d00eb6bb79ed4c15382ee6775bd9fb0"}]}
// mutate4javascript-manifest-end
