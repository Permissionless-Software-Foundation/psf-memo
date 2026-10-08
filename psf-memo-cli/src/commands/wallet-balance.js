/*
  Check the balance of a wallet in terms of BCH and SLP tokens.
*/

// Global npm libraries
import BchWallet from 'minimal-slp-wallet'
import fs from 'fs'

// Local libraries
import WalletUtil from '../lib/wallet-util.js'
import config from '../../config/index.js'
import { bindMethods } from '../lib/bind-methods.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'
import { getTokenBalances } from '../lib/token-balances.js'

class WalletBalance {
  constructor () {
    // Encapsulate dependencies
    this.BchWallet = BchWallet
    this.walletUtil = new WalletUtil()
    this.config = config
    this.fs = fs

    // Bind 'this' object to all subfunctions.
    bindMethods(this, [
      'run',
      'validateFlags',
      'getBalances',
      'displayBalance'
    ])
  }

  async run (flags) {
    try {
      this.validateFlags(flags)

      // Initialize the wallet.
      this.bchWallet = await this.walletUtil.instanceWallet(flags.name)
      await this.bchWallet.initialize()

      // Get the wallet with updated UTXO data.
      const walletData = await this.getBalances()

      // Display wallet balances on the screen.
      this.displayBalance(walletData, flags)

      return true
    } catch (err) {
      console.error('Error in wallet-balance: ', err)
      return 0
    }
  }

  validateFlags (flags) {
    return validateRequiredFlags([
      [flags.name, 'You must specify a wallet name with the -n flag.']
    ])
  }

  // Generate a new wallet instance and update it's balance. This function returns
  // a handle to an instance of the wallet library.
  // This function is called by other commands in this app.
  async getBalances () {
    try {
      // Loop through each BCH UTXO and add up the balance.
      let satBalance = 0
      for (let i = 0; i < this.bchWallet.utxos.utxoStore.bchUtxos.length; i++) {
        const thisUtxo = this.bchWallet.utxos.utxoStore.bchUtxos[i]

        satBalance += thisUtxo.value
      }
      const bchBalance = this.bchWallet.bchjs.BitcoinCash.toBitcoinCash(
        satBalance
      )
      this.bchWallet.satBalance = satBalance
      this.bchWallet.bchBalance = bchBalance

      return this.bchWallet
    } catch (err) {
      console.log('Error in getBalances()')
      throw err
    }
  }

  // Take the updated wallet data and display it on the screen.
  displayBalance (walletData, flags = {}) {
    try {
      // Loop through each BCH UTXO and add up the balance.
      console.log(
        `BCH balance: ${walletData.satBalance} satoshis or ${walletData.bchBalance} BCH`
      )

      // console.log(
      //   'walletData.utxos.utxoStore.slpUtxos.type1.tokens: ',
      //   walletData.utxos.utxoStore.slpUtxos.type1.tokens
      // )

      // Combine token UTXOs
      const tokenUtxos = walletData.utxos.utxoStore.slpUtxos.type1.tokens.concat(
        walletData.utxos.utxoStore.slpUtxos.group.tokens,
        walletData.utxos.utxoStore.slpUtxos.nft.tokens
      )

      // Print out SLP Type1 tokens
      console.log('\nTokens:')
      const tokens = getTokenBalances(tokenUtxos)
      for (let i = 0; i < tokens.length; i++) {
        const thisToken = tokens[i]
        console.log(`${thisToken.ticker} ${thisToken.qty} ${thisToken.tokenId}`)
      }

      // Print out minting batons
      const mintBatons = walletData.utxos.utxoStore.slpUtxos.type1.mintBatons.concat(
        walletData.utxos.utxoStore.slpUtxos.group.mintBatons
      )
      if (mintBatons.length > 0) {
        console.log('\nMinting Batons: ')
        // console.log(`walletData.utxos.utxoStore: ${JSON.stringify(walletData.utxos.utxoStore, null, 2)}`)

        for (let i = 0; i < mintBatons.length; i++) {
          const thisBaton = mintBatons[i]

          let type = 'Fungible'
          if (thisBaton.tokenType === 129) type = 'Group'

          console.log(`${thisBaton.ticker} (${type}) ${thisBaton.tokenId}`)
        }
      }

      // If verbose flag is set, display UTXO information.
      // if (flags.verbose) {
      //   console.log(
      //     `\nUTXO information:\n${JSON.stringify(
      //       walletData.utxos.utxoStore,
      //       null,
      //       2
      //     )}`
      //   )
      // }

      return true
    } catch (err) {
      console.error('Error in displayBalance()')
      throw err
    }
  }
}

export default WalletBalance

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:49:07.420Z","module_hash":"013461029c4dbae6917825c0e91e2ce7b28349721d120b05856ae167acf845b0","functions":[{"id":"func/WalletBalance.constructor","name":"WalletBalance.constructor","line":17,"end_line":31,"hash":"258fea4b9e8f04fd0deffaba24a7d4b0c1717477a5693a3023590f7e91ba03ba"},{"id":"func/WalletBalance.run","name":"WalletBalance.run","line":33,"end_line":52,"hash":"b450c5f66acf32ec889547c8b0cba87f832d6582799f427f491ccac186216318"},{"id":"func/WalletBalance.validateFlags","name":"WalletBalance.validateFlags","line":54,"end_line":58,"hash":"fac8d97b616886f6174debf90ef3507e12969edc27df3a844b5f027c242bc73d"},{"id":"func/WalletBalance.getBalances","name":"WalletBalance.getBalances","line":63,"end_line":83,"hash":"6ba2437de5c6057e7fb2063d978f5a2ead3dde566880c588881a9f301eeeb90e"},{"id":"func/WalletBalance.displayBalance","name":"WalletBalance.displayBalance","line":86,"end_line":146,"hash":"fb407f9ba5cf3d5bad761a73643c9f361d634f79cfc98b06feec0d81a345245b"}]}
// mutate4javascript-manifest-end
