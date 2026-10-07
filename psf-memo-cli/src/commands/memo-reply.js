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
import { initWriteCommand, runWriteCommand } from '../lib/write-command.js'

class MemoReply {
  constructor (options = {}) {
    initWriteCommand(this, options)
  }

  // Validate the parent txid and reply, resolve the wallet, broadcast, and
  // report the txid and explorer link. Returns the exit code (0/1/2).
  async run (flags = {}) {
    return runWriteCommand({
      command: this,
      flags,
      parse: parseReplyFlags,
      format: formatReplyMessage
    })
  }

  // Validate the parent txid and reply text. The wallet source is validated by
  // the shared resolver during run. Returns true when the flags are usable.
  validateFlags (flags = {}) {
    parseReplyFlags(flags)
    return true
  }

  // Broadcast the two-field Memo reply action through the shared scaffolding.
  post ({ wallet, parentBytes, text }) {
    return this.broadcast({
      wallet,
      prefix: MEMO_REPLY_PREFIX,
      fields: [parentBytes, text]
    })
  }
}

export default MemoReply

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
