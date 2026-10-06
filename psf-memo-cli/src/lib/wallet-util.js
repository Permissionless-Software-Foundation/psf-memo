/*
  wallet-based utility functions used by several different commands
*/

// Global npm libraries.
import { promises as fs } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'
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

  // Save wallet data to a JSON file. The .wallets/ directory is gitignored and
  // does not exist in a fresh checkout, so create it on first use.
  async saveWallet (filename, walletData) {
    await this.fs.mkdir(path.dirname(filename), { recursive: true })
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
// {"version":1,"tested_at":"2026-10-06T22:42:48.678Z","module_hash":"4ce82c583ca27cc47be7879c6abc0d43144d5283921b83a00c61eddf4988f6e1","functions":[{"id":"func/WalletUtil.constructor","name":"WalletUtil.constructor","line":19,"end_line":27,"hash":"a4790d4aba5bd980b0e70f0ed03dd573cd9aec362151340dbdd55da56df73474"},{"id":"func/WalletUtil.saveWallet","name":"WalletUtil.saveWallet","line":31,"end_line":36,"hash":"242d3f0b69343d801e7b12584e04f8bd1936e7fedce43314e68069f5753aa508"},{"id":"func/WalletUtil.instanceWallet","name":"WalletUtil.instanceWallet","line":42,"end_line":71,"hash":"bf4f6860f6b04f1e6b40e7e94fd9baea4b736bd03c4c7012125162dbd8961a26"}]}
// mutate4javascript-manifest-end
