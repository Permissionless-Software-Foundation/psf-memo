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
import { runCommand } from '../lib/reporter.js'
import { resolveWalletSource } from '../lib/wallet-source.js'
import { broadcastMemo } from '../lib/memo-broadcast.js'
import {
  parseReplyFlags,
  formatReplyMessage,
  MEMO_REPLY_PREFIX
} from '../lib/memo-reply.js'
import WalletUtil from '../lib/wallet-util.js'
import { bindMethods } from '../lib/bind-methods.js'

class MemoReply {
  constructor (options = {}) {
    // Encapsulate dependencies so tests and acceptance can inject a fake wallet
    // source, broadcast, and output streams instead of touching the network or
    // a real wallet file.
    this.walletUtil = options.walletUtil || new WalletUtil()
    this.broadcast = options.broadcast || broadcastMemo
    this.stdout = options.stdout
    this.stderr = options.stderr

    bindMethods(this, ['run', 'validateFlags', 'post'])
  }

  // Validate the parent txid and reply, resolve the wallet, broadcast, and
  // report the txid and explorer link. Returns the exit code (0/1/2) and
  // assigns it to process.exitCode for commander.
  async run (flags = {}) {
    const code = await runCommand(async () => {
      const { parentBytes, text } = parseReplyFlags(flags)

      const { wallet } = await resolveWalletSource(
        { name: flags.name, wif: flags.wif },
        { walletUtil: this.walletUtil }
      )

      const { txid, explorerUrl } = await this.post({ wallet, parentBytes, text })

      return {
        message: formatReplyMessage({ txid, explorerUrl }),
        data: { txid, explorerUrl }
      }
    }, {
      json: flags.json,
      stdout: this.stdout,
      stderr: this.stderr
    })

    process.exitCode = code
    return code
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
