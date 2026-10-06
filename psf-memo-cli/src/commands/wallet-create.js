/*
  Create a new wallet.
*/

// Global npm libraries
import BchWallet from 'minimal-slp-wallet'

// Local libraries
import WalletUtil from '../lib/wallet-util.js'

// Global variables
const __dirname = import.meta.dirname

class WalletCreate {
  constructor () {
    // Encapsulate all dependencies
    this.BchWallet = BchWallet
    this.walletUtil = new WalletUtil()

    // Bind 'this' object to all subfunctions
    this.run = this.run.bind(this)
    this.validateFlags = this.validateFlags.bind(this)
    this.createWallet = this.createWallet.bind(this)
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
    // Exit if wallet not specified.
    const name = flags.name
    if (!name || name === '') {
      throw new Error('You must specify a wallet name with the -n flag.')
    }

    return true
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
// {"version":1,"tested_at":"2026-10-06T22:18:46.180Z","module_hash":"2cb950ce9fbdf1768d1741120c4dbb7749d72603ada31700e975d7e9d7924262","functions":[{"id":"func/WalletCreate.constructor","name":"WalletCreate.constructor","line":15,"end_line":24,"hash":"ec75151282efe6903824e2badd51264b6f5eef27e5f050e18dfcc1ac129c74ac"},{"id":"func/WalletCreate.run","name":"WalletCreate.run","line":26,"end_line":47,"hash":"f555d068ea38a099185c98c6086744c6c04cc952bffc90a99a286a8d89c357aa"},{"id":"func/WalletCreate.validateFlags","name":"WalletCreate.validateFlags","line":49,"end_line":57,"hash":"8e0b3d7d6ba8ea4bda31ccd48cbc4cbf2a535b43fb8f99622cb608c93b7aa529"},{"id":"func/WalletCreate.createWallet","name":"WalletCreate.createWallet","line":60,"end_line":93,"hash":"7ead5cad3bd1d0ef9da35774044f014dc620de9110858300bab7410fbef3b20a"}]}
// mutate4javascript-manifest-end
