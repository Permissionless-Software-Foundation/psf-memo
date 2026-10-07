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
// {"version":1,"tested_at":"2026-10-07T18:51:27.970Z","module_hash":"dfd07f0536be0fb20ee88649c22d4a578b9bab41afd2a2454d7488831a270209","functions":[{"id":"func/MemoLike.constructor","name":"MemoLike.constructor","line":24,"end_line":26,"hash":"10718fa44618a6c0f6b3ec5b4a8283630b46666f3db9383015d681b3819c2eb7"},{"id":"func/MemoLike.run","name":"MemoLike.run","line":30,"end_line":37,"hash":"558652183c0a214af76bbe58140ac77ad3cf2975c874e14fd1d3510fd97205e5"},{"id":"func/MemoLike.validateFlags","name":"MemoLike.validateFlags","line":41,"end_line":44,"hash":"d1fcad860623c0ebb74e59dd837a989088026f4ccf89dad6c437913fcda141dd"},{"id":"func/MemoLike.post","name":"MemoLike.post","line":48,"end_line":68,"hash":"cd39d2ab2b66d18c2b13c6fb6e68e4e2e5805139675d2606ec0e8ad8fa890db8"}]}
// mutate4javascript-manifest-end
