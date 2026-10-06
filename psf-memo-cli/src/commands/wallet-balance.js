/*
  Check the balance of a wallet in terms of BCH and SLP tokens.
*/

// Global npm libraries
import BchWallet from 'minimal-slp-wallet'
import collect from 'collect.js'
import fs from 'fs'

// Local libraries
import WalletUtil from '../lib/wallet-util.js'
import config from '../../config/index.js'
import { bindMethods } from '../lib/bind-methods.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'

class WalletBalance {
  constructor () {
    // Encapsulate dependencies
    this.BchWallet = BchWallet
    this.walletUtil = new WalletUtil()
    this.config = config
    this.fs = fs
    this.collect = collect

    // Bind 'this' object to all subfunctions.
    bindMethods(this, [
      'run',
      'validateFlags',
      'getBalances',
      'displayBalance',
      'getTokenBalances'
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
      const tokens = this.getTokenBalances(
        // walletData.utxos.utxoStore.slpUtxos.type1.tokens
        tokenUtxos
      )
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

  // Add up the token balances.
  // At the moment, minting batons, NFTs, and group tokens are not suported.
  getTokenBalances (tokenUtxos) {
    // console.log('tokenUtxos: ', tokenUtxos)

    const tokens = []
    const tokenIds = []

    // Summarized token data into an array of token UTXOs.
    for (let i = 0; i < tokenUtxos.length; i++) {
      const thisUtxo = tokenUtxos[i]

      const thisToken = {
        ticker: thisUtxo.ticker,
        tokenId: thisUtxo.tokenId,
        qty: parseFloat(thisUtxo.qtyStr)
      }

      tokens.push(thisToken)

      tokenIds.push(thisUtxo.tokenId)
    }

    // Create a unique collection of tokenIds
    const collection = collect(tokenIds)
    let unique = collection.unique()
    unique = unique.toArray()

    // Add up any duplicate entries.
    // The finalTokenData array contains unique objects, one for each token,
    // with a total quantity of tokens for the entire wallet.
    const finalTokenData = []
    for (let i = 0; i < unique.length; i++) {
      const thisTokenId = unique[i]

      const thisTokenData = {
        tokenId: thisTokenId,
        qty: 0
      }

      // Add up the UTXO quantities for the current token ID.
      for (let j = 0; j < tokens.length; j++) {
        const thisToken = tokens[j]

        if (thisTokenId === thisToken.tokenId) {
          thisTokenData.ticker = thisToken.ticker
          thisTokenData.qty += thisToken.qty
        }
      }

      finalTokenData.push(thisTokenData)
    }

    return finalTokenData
  }
}

export default WalletBalance

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-06T22:20:09.031Z","module_hash":"c736cf6f102b1f7cf09fea351401ec21fa285a4f44804a052b7c16a2d1cbf3f1","functions":[{"id":"func/WalletBalance.constructor","name":"WalletBalance.constructor","line":15,"end_line":29,"hash":"37e6b320bd9acecf6d02869ce95d5068bc2278fe86797e863be2041083685ffb"},{"id":"func/WalletBalance.run","name":"WalletBalance.run","line":31,"end_line":50,"hash":"b450c5f66acf32ec889547c8b0cba87f832d6582799f427f491ccac186216318"},{"id":"func/WalletBalance.validateFlags","name":"WalletBalance.validateFlags","line":52,"end_line":60,"hash":"8e0b3d7d6ba8ea4bda31ccd48cbc4cbf2a535b43fb8f99622cb608c93b7aa529"},{"id":"func/WalletBalance.getBalances","name":"WalletBalance.getBalances","line":65,"end_line":85,"hash":"6ba2437de5c6057e7fb2063d978f5a2ead3dde566880c588881a9f301eeeb90e"},{"id":"func/WalletBalance.displayBalance","name":"WalletBalance.displayBalance","line":88,"end_line":151,"hash":"e44f65e1b05bd826b2c0d4578e737d73221814000fc8c5dc948d187f6ab6f5a1"},{"id":"func/WalletBalance.getTokenBalances","name":"WalletBalance.getTokenBalances","line":155,"end_line":207,"hash":"69e661ea12a0820945b7e5c3767f2f5872a49821345df700fc6a6c8dadcbccae"}]}
// mutate4javascript-manifest-end
