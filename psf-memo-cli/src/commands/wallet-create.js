/*
  Create a new wallet.
*/

// Global npm libraries
import BchWallet from 'minimal-slp-wallet'

// Local libraries
import WalletUtil from '../lib/wallet-util.js'
import { bindMethods } from '../lib/bind-methods.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'

// Global variables
const __dirname = import.meta.dirname

class WalletCreate {
  constructor () {
    // Encapsulate all dependencies
    this.BchWallet = BchWallet
    this.walletUtil = new WalletUtil()

    // Bind 'this' object to all subfunctions
    bindMethods(this, ['run', 'validateFlags', 'createWallet'])
  }

  async run (flags) {
    try {
      this.validateFlags(flags)

      // Generate a filename for the wallet file.
      const filename = `${__dirname.toString()}/../../.wallets/${
        flags.name
      }.json`

      if (!flags.description) flags.description = ''

      console.log(`wallet-create executed with name ${flags.name} and description ${flags.description}`)

      const walletData = await this.createWallet(filename, flags.description)
      // console.log('walletData: ', walletData)

      return walletData
    } catch (err) {
      console.error('Error in WalletCreate.run(): ', err)
      return 0
    }
  }

  validateFlags (flags) {
    return validateRequiredFlags([
      [flags.name, 'You must specify a wallet name with the -n flag.']
    ])
  }

  // Create a new wallet file.
  async createWallet (filename, desc) {
    try {
      if (!filename || typeof filename !== 'string') {
        throw new Error('filename required.')
      }

      if (!desc) desc = ''

      // Configure the minimal-slp-wallet library to use the JSON RPC over IPFS.
      // const advancedConfig = this.walletUtil.getRestServer()
      const advancedConfig = {}
      advancedConfig.noUpdate = true

      // Wait for the wallet to be created.
      this.bchWallet = new this.BchWallet(undefined, advancedConfig)
      await this.bchWallet.walletInfoPromise

      // console.log('bchWallet.walletInfo: ', this.bchWallet.walletInfo)

      // Create the initial wallet JSON object.
      const walletData = {
        wallet: this.bchWallet.walletInfo
      }
      walletData.wallet.description = desc

      // Write out the basic information into a json file for other apps to use.
      await this.walletUtil.saveWallet(filename, walletData)

      return walletData.wallet
    } catch (err) {
      console.log('Error in createWallet().')
      throw err
    }
  }
}

export default WalletCreate

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:49:33.597Z","module_hash":"3702167d7c325573ada0e762b0b580bc8b2e382671e8b34318bc7f3c3b5b2a30","functions":[{"id":"func/WalletCreate.constructor","name":"WalletCreate.constructor","line":17,"end_line":24,"hash":"2c05fbefd8d185b978fb8ddda5bdb9baae4f80f7a97762e10e359d61e51c8022"},{"id":"func/WalletCreate.run","name":"WalletCreate.run","line":26,"end_line":47,"hash":"f555d068ea38a099185c98c6086744c6c04cc952bffc90a99a286a8d89c357aa"},{"id":"func/WalletCreate.validateFlags","name":"WalletCreate.validateFlags","line":49,"end_line":53,"hash":"fac8d97b616886f6174debf90ef3507e12969edc27df3a844b5f027c242bc73d"},{"id":"func/WalletCreate.createWallet","name":"WalletCreate.createWallet","line":56,"end_line":89,"hash":"7ead5cad3bd1d0ef9da35774044f014dc620de9110858300bab7410fbef3b20a"}]}
// mutate4javascript-manifest-end
