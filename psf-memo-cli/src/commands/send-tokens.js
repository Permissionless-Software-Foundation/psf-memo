/*
  Send SLP tokens to an address.
*/

// Local libraries
import WalletUtil from '../lib/wallet-util.js'
import { bindMethods } from '../lib/bind-methods.js'
import { runSendCommand } from '../lib/send-command.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'
import { getTokenBalances } from '../lib/token-balances.js'

class SendTokens {
  constructor () {
    // Encapsulate dependencies
    this.walletUtil = new WalletUtil()
    this.bchWallet = {} // Placeholder for instance of wallet.
    // Pure token-balance helper, injected so tests can stub it and so this
    // command does not depend on the wallet-balance command.
    this.getTokenBalances = getTokenBalances

    // Bind 'this' object to all subfunctions.
    bindMethods(this, ['run', 'validateFlags', 'sendTokens'])
  }

  async run (flags) {
    return runSendCommand({
      command: this,
      flags,
      send: this.sendTokens,
      explorerUrl: 'https://token.fullstack.cash/transactions/?txid=',
      errorLabel: 'send-tokens'
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
    try {
      // Update the wallet UTXOs.
      await this.bchWallet.initialize()

      // console.log('this.bchWallet.utxos.utxoStore: ', this.bchWallet.utxos.utxoStore)

      // Combine token UTXOs
      const tokenUtxos = this.bchWallet.utxos.utxoStore.slpUtxos.type1.tokens.concat(
        this.bchWallet.utxos.utxoStore.slpUtxos.group.tokens,
        this.bchWallet.utxos.utxoStore.slpUtxos.nft.tokens
      )

      // Isolate the token balances.
      const tokens = this.getTokenBalances(tokenUtxos)
      // console.log(`tokens: ${JSON.stringify(tokens, null, 2)}`)

      if (!tokens.length) {
        throw new Error('No tokens found on this wallet.')
      }
      // console.log('tokens', tokens)

      const tokenToSend = tokens.find(val => val.tokenId === flags.tokenId)
      // console.log('tokenToSend', tokenToSend)

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

      const result = await this.bchWallet.sendTokens(receiver, 3.0)
      // console.log('result: ', result)

      return result
    } catch (err) {
      console.error('Error in sendTokens()')
      throw err
    }
  }
}

export default SendTokens

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:48:36.259Z","module_hash":"170e9d3b6cd9e123aace011e30544d8163c202e1b262d8680beed5dee6ccf7a9","functions":[{"id":"func/SendTokens.constructor","name":"SendTokens.constructor","line":13,"end_line":23,"hash":"cb3798cccbe8aba1213931aa7041d32bfcc671ef5a42db32019c5bf7aff680fc"},{"id":"func/SendTokens.run","name":"SendTokens.run","line":25,"end_line":33,"hash":"f08ac6cab121baa0e3721b10dcfac575399d5713717ed469ef4ea3c44f515b07"},{"id":"func/SendTokens.validateFlags","name":"SendTokens.validateFlags","line":35,"end_line":42,"hash":"69cf8fe495bf21a56b5e5f87e2e57153cd35c6bae5723d7e0f6d4a43b8275aac"},{"id":"func/SendTokens.sendTokens","name":"SendTokens.sendTokens","line":44,"end_line":93,"hash":"7b3a1baf407fd27a08d230ebce8a41d889416dfd83b333bd24cbee740c5c2039"}]}
// mutate4javascript-manifest-end
