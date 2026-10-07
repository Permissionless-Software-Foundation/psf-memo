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
import { initWriteCommand, runWriteCommand } from '../lib/write-command.js'

class MemoPost {
  constructor (options = {}) {
    initWriteCommand(this, options)
  }

  // Validate the memo, resolve the wallet, broadcast the post, and report the
  // txid and explorer link. Returns the exit code (0/1/2).
  async run (flags = {}) {
    return runWriteCommand({
      command: this,
      flags,
      parse: parseMemoPostFlags,
      format: formatMemoPostMessage
    })
  }

  // Validate the memo text. The wallet source is validated by the shared
  // resolver during run. Returns true when the memo is usable.
  validateFlags (flags = {}) {
    parseMemoPostFlags(flags)
    return true
  }

  // Broadcast the single-field Memo post action through the shared scaffolding.
  post ({ wallet, memo }) {
    return this.broadcast({
      wallet,
      prefix: MEMO_POST_PREFIX,
      fields: [memo]
    })
  }
}

export default MemoPost

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-07T17:07:09.927Z","module_hash":"f31fc748a5d848dc9987037c3395e97c182865cf6684805998ee00f145749150","functions":[{"id":"func/MemoPost.constructor","name":"MemoPost.constructor","line":26,"end_line":36,"hash":"58a3cff261f283f8e1119d512dde0dcb12ec870b1aedf7dfd071a6689ce48f86"},{"id":"func/MemoPost.run","name":"MemoPost.run","line":41,"end_line":64,"hash":"951a15b04c6287e928fabe08db1d39f1339667c918f1e52b958f150471554b21"},{"id":"func/MemoPost.validateFlags","name":"MemoPost.validateFlags","line":68,"end_line":71,"hash":"5d68d7586c8dec507165926f9661d00fe53403ea9f1f0ac2b80ce55740183e92"},{"id":"func/MemoPost.post","name":"MemoPost.post","line":74,"end_line":80,"hash":"944e6884783f3e6b55691ab1c29795da58cf95d2878e27402d9fee288b1172b1"}]}
// mutate4javascript-manifest-end
