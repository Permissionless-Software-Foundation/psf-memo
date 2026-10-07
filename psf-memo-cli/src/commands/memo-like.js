/*
  memo-like: broadcast a 0x6d04 Memo like, with an optional tip.

  It resolves the signing wallet (-n <wallet> or --wif <wif>), requires the
  liked post txid (-t), and broadcasts the like action carrying the post txid
  in 32-byte little-endian wire order through the shared broadcast scaffolding.
  An optional tip (--tip <sats>, --author <addr>) adds a P2PKH output paying the
  post author in the same transaction. A bad tip is a usage error (exit 2); a
  wallet below the 3000-sat floor or a tip above the spendable balance is an
  error (exit 1); a rejected broadcast surfaces the wallet's real error.
*/

// Local libraries
import {
  parseLikeFlags,
  spendableSats,
  formatLikeMessage,
  MEMO_LIKE_PREFIX,
  DUST_LIMIT_SATS
} from '../lib/memo-like.js'
import { initWriteCommand, runWriteCommand } from '../lib/write-command.js'

class MemoLike {
  constructor (options = {}) {
    initWriteCommand(this, options)
  }

  // Validate the post txid and tip, resolve the wallet, broadcast, and report
  // the txid and explorer link. Returns the exit code (0/1/2).
  async run (flags = {}) {
    return runWriteCommand({
      command: this,
      flags,
      parse: parseLikeFlags,
      format: formatLikeMessage
    })
  }

  // Validate the post txid and tip. The wallet source and spendable balance are
  // checked during run. Returns true when the flags are usable.
  validateFlags (flags = {}) {
    parseLikeFlags(flags)
    return true
  }

  // Refresh the wallet, check the spendable balance and tip, then broadcast the
  // like and its optional tip output through the shared scaffolding.
  async post ({ wallet, postBytes, tipSats, author }) {
    await wallet.initialize()

    const spendable = spendableSats(wallet)
    if (spendable < DUST_LIMIT_SATS) {
      throw new Error('add BCH to your wallet before liking a post.')
    }

    if (tipSats > spendable) {
      throw new Error('Tip exceeds the spendable balance.')
    }

    const bchOutput = tipSats > 0 ? [{ address: author, amountSat: tipSats }] : []

    return this.broadcast({
      wallet,
      prefix: MEMO_LIKE_PREFIX,
      fields: [postBytes],
      bchOutput
    })
  }
}

export default MemoLike

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
