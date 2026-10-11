/*
  Send SLP tokens to an address.
*/

// Local libraries
import { initWalletCommand } from '../lib/init-command.js'
import { runSendCommand } from '../lib/send-command.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'
import { getTokenBalances } from '../lib/token-balances.js'

class SendTokens {
  constructor (options = {}) {
    initWalletCommand(this, options, ['sendTokens'], { bchWallet: {}, getTokenBalances })
  }

  async run (flags = {}) {
    return runSendCommand({
      command: this,
      flags,
      send: this.sendTokens,
      explorerUrl: 'https://token.fullstack.cash/transactions/?txid='
    })
  }

  validateFlags (flags = {}) {
    return validateRequiredFlags([
      [flags.name, 'You must specify a wallet name with the -n flag.'],
      [flags.addr, 'You must specify a receiver address with the -a flag.'],
      [flags.qty, 'You must specify a quantity in BCH with the -q flag.'],
      [flags.tokenId, 'You must specify a token ID with the -t flag.']
    ])
  }

  async sendTokens (flags) {
    // Update the wallet UTXOs.
    await this.bchWallet.initialize()

    // Combine token UTXOs
    const tokenUtxos = this.bchWallet.utxos.utxoStore.slpUtxos.type1.tokens.concat(
      this.bchWallet.utxos.utxoStore.slpUtxos.group.tokens,
      this.bchWallet.utxos.utxoStore.slpUtxos.nft.tokens
    )

    // Isolate the token balances.
    const tokens = this.getTokenBalances(tokenUtxos)

    if (!tokens.length) {
      throw new Error('No tokens found on this wallet.')
    }

    const tokenToSend = tokens.find(val => val.tokenId === flags.tokenId)

    if (!tokenToSend) {
      throw new Error('No tokens in the wallet matched the given token ID.')
    }

    if (tokenToSend.qty < flags.qty) {
      throw new Error(
        `Insufficient funds. You are trying to send ${flags.qty}, but the wallet only has ${tokenToSend.qty}`
      )
    }

    const receiver = {
      address: flags.addr,
      tokenId: tokenToSend.tokenId,
      qty: flags.qty
    }

    return this.bchWallet.sendTokens(receiver, 3.0)
  }
}

export default SendTokens

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T18:37:58.064Z","module_hash":"c308ed7d1f1d1e0e722e1536a5b6933d22fbef4837d0a9cc6dbb59767c40a8a6","functions":[{"id":"func/SendTokens.constructor","name":"SendTokens.constructor","line":12,"end_line":14,"hash":"093d70ecad587aa76f4ef3cd1c455b0c417b8ac8e703b6b6ce082847f987ad39"},{"id":"func/SendTokens.run","name":"SendTokens.run","line":16,"end_line":23,"hash":"f700c96cdf4691fbdf9359fa4a6cddc4a507b52d58773acfcb8f53f889d2e146"},{"id":"func/SendTokens.validateFlags","name":"SendTokens.validateFlags","line":25,"end_line":32,"hash":"69cf8fe495bf21a56b5e5f87e2e57153cd35c6bae5723d7e0f6d4a43b8275aac"},{"id":"func/SendTokens.sendTokens","name":"SendTokens.sendTokens","line":34,"end_line":70,"hash":"0811cb416e95cce10da2473e8308f1bfd866b3d41d6eb31f83cce45601cf086f"}]}
// mutate4javascript-manifest-end
