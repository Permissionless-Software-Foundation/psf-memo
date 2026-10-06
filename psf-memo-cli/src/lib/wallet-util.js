/*
  wallet-based utility functions used by several different commands
*/

// Global npm libraries.
import { promises as fs } from 'fs'
import { readFile } from 'fs/promises'
import BchWallet from 'minimal-slp-wallet'

// Local libraries
import config from '../../config/index.js'
import { bindMethods } from './bind-methods.js'

// Global variables
const __dirname = import.meta.dirname

class WalletUtil {
  constructor () {
    // Encapsulate all dependencies
    this.fs = fs
    this.config = config
    this.BchWallet = BchWallet

    // Bind 'this' object to all subfunctions.
    bindMethods(this, ['saveWallet'])
  }

  // Save wallet data to a JSON file.
  async saveWallet (filename, walletData) {
    await this.fs.writeFile(filename, JSON.stringify(walletData, null, 2))

    return true
  }

  // Takes the wallet filename as input and returns an instance of
  // minimal-slp-wallet. Note: It will usually be best to run the
  // bchwallet.initialize() command after calling this function, to retrieve
  // the UTXOs held by the wallet.
  async instanceWallet (walletName) {
    try {
      // Input validation
      if (!walletName || typeof walletName !== 'string') {
        throw new Error('walletName is required.')
      }

      const filename = `${__dirname.toString()}/../../.wallets/${walletName}.json`

      // Load the wallet file.
      const walletStr = await readFile(filename)
      let walletData = JSON.parse(walletStr)
      walletData = walletData.wallet

      // Use info from the config file on how to initialize the wallet lib.
      const advancedConfig = {}
      advancedConfig.restURL = this.config.restURL
      advancedConfig.interface = this.config.interface
      advancedConfig.hdPath = walletData.hdPath

      const bchWallet = new this.BchWallet(walletData.mnemonic, advancedConfig)

      await bchWallet.walletInfoPromise

      return bchWallet
    } catch (err) {
      console.error('Error in wallet-util.js/instanceWallet()')
      throw err
    }
  }
}

export default WalletUtil

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-06T22:19:13.675Z","module_hash":"04a8d773888ce91dc643d24faff10f4d3a75c55aef8576429501f98700f7101f","functions":[{"id":"func/WalletUtil.constructor","name":"WalletUtil.constructor","line":17,"end_line":25,"hash":"88aad542369fccdb87f12a73c782ec1dee86bc9cb776783943c6f0a27c946143"},{"id":"func/WalletUtil.saveWallet","name":"WalletUtil.saveWallet","line":28,"end_line":32,"hash":"496a75658c44bf9aa3ce0191d335ebcebc3452f627619a031759fd9c117ec095"},{"id":"func/WalletUtil.instanceWallet","name":"WalletUtil.instanceWallet","line":38,"end_line":67,"hash":"bf4f6860f6b04f1e6b40e7e94fd9baea4b736bd03c4c7012125162dbd8961a26"}]}
// mutate4javascript-manifest-end
