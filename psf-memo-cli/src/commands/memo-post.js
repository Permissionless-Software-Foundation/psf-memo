/*
  memo-post: broadcast a 0x6d02 Memo post.

  The first memo-* write command. It resolves the signing wallet
  (-n <wallet> or --wif <wif>), validates the memo text against the 0x6d02
  limit of 217 characters (UTF-16 code units, not bytes), broadcasts the
  single-field Memo action [6d02, text] through the shared broadcast
  scaffolding, and reports the transaction id plus its bch.loping.net explorer
  link. A missing or invalid flag is a usage error (exit 2); a rejected
  broadcast surfaces the wallet's real error (exit 1).
*/

// Local libraries
import {
  parseMemoPostFlags,
  formatMemoPostMessage,
  MEMO_POST_PREFIX
} from '../lib/memo-post.js'
import { defineFieldWriteCommand } from '../lib/write-command.js'

const MemoPost = defineFieldWriteCommand({
  parse: parseMemoPostFlags,
  format: formatMemoPostMessage,
  prefix: MEMO_POST_PREFIX,
  field: 'memo'
})

export default MemoPost

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T01:51:35.303Z","module_hash":"e50853d1d810d04c0582519f24427db10862e099cc71ec3d5a5b3680d6436dd5","functions":[]}
// mutate4javascript-manifest-end
