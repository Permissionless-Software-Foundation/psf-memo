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
  constructor ({ walletUtil, stdout, stderr } = {}) {
    // Encapsulate dependencies
    this.walletUtil = walletUtil || new WalletUtil()
    this.bchWallet = {} // Placeholder for instance of wallet.
    // Pure token-balance helper, injected so tests can stub it and so this
    // command does not depend on the wallet-balance command.
    this.getTokenBalances = getTokenBalances
    this.stdout = stdout
    this.stderr = stderr

    // Bind 'this' object to all subfunctions.
    bindMethods(this, ['run', 'validateFlags', 'sendTokens'])
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
