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
import { bindMethods } from '../lib/bind-methods.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'

class WalletSweep {
  constructor () {
    // Encapsulate Dependencies
    this.BchTokenSweep = BchTokenSweep
    this.walletUtil = new WalletUtil()

    // Bind 'this' object to all subfunctions.
    bindMethods(this, ['run', 'validateFlags', 'sweepWif'])
  }

  async run (flags) {
    try {
      this.validateFlags(flags)

      // Initialize the wallet.
      this.bchWallet = await this.walletUtil.instanceWallet(flags.name)

      // Sweep any BCH and tokens from the private key.
      const txid = await this.sweepWif(flags)

      console.log('BCH successfully swept from the private key')
      console.log(`TXID: ${txid}`)
      console.log('\nView this transaction on a block explorer:')
      console.log(`https://bch.loping.net/tx/${txid}`)

      return true
    } catch (err) {
      console.error('Error in wallet-sweep: ', err)
      return 0
    }
  }

  validateFlags (flags = {}) {
    return validateRequiredFlags([
      [flags.name, 'You must specify a wallet name with the -n flag.'],
      [flags.wif, 'You must specify a private key to sweep with the -w flag.']
    ])
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
// {"version":1,"tested_at":"2026-10-08T14:50:11.657Z","module_hash":"7f2e84295eb5942930e7e8d55b2698e06699cff563ca78b0727983b9a81b9f88","functions":[{"id":"func/WalletSweep.constructor","name":"WalletSweep.constructor","line":19,"end_line":26,"hash":"ab63c345e3fa0384d785e73d29d950e0c7b1ecdd9cde0c6a451ece98d4117ff1"},{"id":"func/WalletSweep.run","name":"WalletSweep.run","line":28,"end_line":48,"hash":"62b3dc4057053b9e820f1be755ad466191ed5b265ce26787f777a11c1439862d"},{"id":"func/WalletSweep.validateFlags","name":"WalletSweep.validateFlags","line":50,"end_line":55,"hash":"a3476b3118f86e162fdc8eef030d4d2b9af24b05f197346fed6bee59ea98fe87"},{"id":"func/WalletSweep.sweepWif","name":"WalletSweep.sweepWif","line":57,"end_line":80,"hash":"790b7ea8f53fc3710561109ef974e0137b7eb126d936bb183a3084d95be0a776"}]}
// mutate4javascript-manifest-end
