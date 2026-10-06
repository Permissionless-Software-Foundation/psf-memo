/*
  This command sweeps a private key in WIF format, and transfers any BCH or SLP
  tokens to the wallet.

  If only SLP tokens held by the private key, the wallet will need some BCH to
  pay TX fees for sweeping the tokens. If the private key has BCH, those
  funds will be used for TX fees.
*/

// Global npm libraries
import BchTokenSweep from 'bch-token-sweep'

// Local libraries
import WalletUtil from '../lib/wallet-util.js'

class WalletSweep {
  constructor () {
    // Encapsulate Dependencies
    this.BchTokenSweep = BchTokenSweep
    this.walletUtil = new WalletUtil()

    // Bind 'this' object to all subfunctions.
    this.run = this.run.bind(this)
    this.validateFlags = this.validateFlags.bind(this)
    this.sweepWif = this.sweepWif.bind(this)
  }

  async run (flags) {
    try {
      this.validateFlags(flags)

      // Initialize the wallet.
      this.bchWallet = await this.walletUtil.instanceWallet(flags.name)

      // Sweep any BCH and tokens from the private key.
      const txid = await this.sweepWif(flags)

      console.log(`BCH successfully swept from private key ${flags.wif}`)
      console.log(`TXID: ${txid}`)
      console.log('\nView this transaction on a block explorer:')
      console.log(`https://bch.loping.net/tx/${txid}`)

      return true
    } catch (err) {
      console.error('Error in send-bch: ', err)
      return 0
    }
  }

  validateFlags (flags = {}) {
    // Exit if wallet not specified.
    const name = flags.name
    if (!name || name === '') {
      throw new Error('You must specify a wallet name with the -n flag.')
    }

    // Exit if wallet not specified.
    const wif = flags.wif
    if (!wif || wif === '') {
      throw new Error('You must specify a private key to sweep with the -w flag.')
    }

    return true
  }

  async sweepWif (flags) {
    try {
      const walletWif = this.bchWallet.walletInfo.privateKey

      // Prepare the BCH Token Sweep library.
      const sweeper = new this.BchTokenSweep(
        flags.wif,
        walletWif,
        this.bchWallet
      )
      await sweeper.populateObjectFromNetwork()

      // Sweep the private key
      const hex = await sweeper.sweepTo(this.bchWallet.walletInfo.slpAddress)

      // Broadcast the transaction.
      const txid = await this.bchWallet.ar.sendTx(hex)

      return txid
    } catch (err) {
      console.error('Error in sweepWif()')
      throw err
    }
  }
}

export default WalletSweep

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-06T22:18:59.776Z","module_hash":"eee9747401aa67153b2135dd375a4279e49e093790735ac1cb7e9586bc6772ec","functions":[{"id":"func/WalletSweep.constructor","name":"WalletSweep.constructor","line":17,"end_line":26,"hash":"634c70929a1ed2d68aa7ef03426e9594d5d752aabe14ef2e85cd8e75aa432724"},{"id":"func/WalletSweep.run","name":"WalletSweep.run","line":28,"end_line":48,"hash":"53317a1764850cfad40a8d158636a8aeea961c367eaacf6c110b284bcba7b23c"},{"id":"func/WalletSweep.validateFlags","name":"WalletSweep.validateFlags","line":50,"end_line":64,"hash":"2628cee6404c194dedae16ad3c13e7fa19eab8b379e90d4b6373963ef3873b60"},{"id":"func/WalletSweep.sweepWif","name":"WalletSweep.sweepWif","line":66,"end_line":89,"hash":"790b7ea8f53fc3710561109ef974e0137b7eb126d936bb183a3084d95be0a776"}]}
// mutate4javascript-manifest-end
