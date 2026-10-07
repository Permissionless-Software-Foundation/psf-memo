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
import { runCommand } from '../lib/reporter.js'
import { resolveWalletSource } from '../lib/wallet-source.js'
import { broadcastMemo } from '../lib/memo-broadcast.js'
import {
  parseMemoPostFlags,
  formatMemoPostMessage,
  MEMO_POST_PREFIX
} from '../lib/memo-post.js'
import WalletUtil from '../lib/wallet-util.js'
import { bindMethods } from '../lib/bind-methods.js'

class MemoPost {
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

  // Validate the memo, resolve the wallet, broadcast the post, and report the
  // txid and explorer link. Returns the exit code (0/1/2) and assigns it to
  // process.exitCode for commander.
  async run (flags = {}) {
    const code = await runCommand(async () => {
      const { memo } = parseMemoPostFlags(flags)

      const { wallet } = await resolveWalletSource(
        { name: flags.name, wif: flags.wif },
        { walletUtil: this.walletUtil }
      )

      const { txid, explorerUrl } = await this.post({ wallet, memo })

      return {
        message: formatMemoPostMessage({ txid, explorerUrl }),
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
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
