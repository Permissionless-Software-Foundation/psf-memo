/*
  Send SLP tokens to an address.
*/

// Local libraries
import WalletUtil from '../lib/wallet-util.js'
import WalletBalance from './wallet-balance.js'
import { bindMethods } from '../lib/bind-methods.js'
import { runSendCommand } from '../lib/send-command.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'

class SendTokens {
  constructor () {
    // Encapsulate dependencies
    this.walletUtil = new WalletUtil()
    this.bchWallet = {} // Placeholder for instance of wallet.
    this.walletBalance = new WalletBalance()

    // Bind 'this' object to all subfunctions.
    bindMethods(this, ['run', 'validateFlags', 'sendTokens'])
  }

  async run (flags) {
    return runSendCommand({
      command: this,
      flags,
      send: this.sendTokens,
      explorerUrl: 'https://token.fullstack.cash/transactions/?txid=',
      errorLabel: 'send-bch'
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
      const tokens = this.walletBalance.getTokenBalances(
        tokenUtxos
      )
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
// {"version":1,"tested_at":"2026-10-06T22:19:29.280Z","module_hash":"08f72f8f49f47ef37de64efed57fbc2b71a149e9a4e630bc7f667a6e5ae8fc23","functions":[{"id":"func/SendTokens.constructor","name":"SendTokens.constructor","line":10,"end_line":20,"hash":"1bf9f2ad42c7e655a31558232d2c371195c8fb8a28d90822231bee4fb570a258"},{"id":"func/SendTokens.run","name":"SendTokens.run","line":22,"end_line":41,"hash":"4691864268caa2067ed4ec58e40040c51e158b093e28ab3b4143f165d5d4a070"},{"id":"func/SendTokens.validateFlags","name":"SendTokens.validateFlags","line":43,"end_line":69,"hash":"175cefdd35ceb1788d44992d11c22c1e11c33b08138e535d6611daa0099294c4"},{"id":"func/SendTokens.sendTokens","name":"SendTokens.sendTokens","line":71,"end_line":122,"hash":"646dc09c73bc36843d8b089360246b16eb560c7be98bae045a16f19fb52db6f1"}]}
// mutate4javascript-manifest-end
