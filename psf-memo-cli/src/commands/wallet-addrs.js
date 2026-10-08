/*
  List the addresses for a wallet
*/

// Global npm libraries
import shelljs from 'shelljs'
import { readFile } from 'fs/promises'
import { bindMethods } from '../lib/bind-methods.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'

// Global variables
const __dirname = import.meta.dirname

class WalletAddrs {
  constructor () {
    // Encapsulate dependencies
    this.shelljs = shelljs

    // Bind 'this' object to all subfunctions.
    bindMethods(this, ['run', 'validateFlags', 'getAddrs'])
  }

  async run (flags) {
    try {
      this.validateFlags(flags)

      // Generate a filename for the wallet file.
      const filename = `${__dirname.toString()}/../../.wallets/${
        flags.name
      }.json`

      return await this.getAddrs(filename)
    } catch (err) {
      console.error('Error in wallet-addrs: ', err)
      return 0
    }
  }

  validateFlags (flags) {
    return validateRequiredFlags([
      [flags.name, 'You must specify a wallet name with the -n flag.']
    ])
  }

  async getAddrs (filename) {
    try {
      // Load the wallet file.
      const walletStr = await readFile(filename)
      let walletData = JSON.parse(walletStr)
      walletData = walletData.wallet

      console.log(' ')
      console.log(`Cash Address: ${walletData.cashAddress}`)
      console.log(`SLP Address: ${walletData.slpAddress}`)
      console.log(`Legacy Address: ${walletData.legacyAddress}`)
      console.log(' ')
      return walletData
    } catch (err) {
      console.error('Error in getAddrs()')
      throw err
    }
  }
}

export default WalletAddrs

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:48:51.428Z","module_hash":"41a0381b84415e7e72fab97f5b75778c726f523975cc50bb6183eec6702da6bd","functions":[{"id":"func/WalletAddrs.constructor","name":"WalletAddrs.constructor","line":15,"end_line":21,"hash":"6b30614e27eaacdb94aa5274843a99a22f3f451badc516fdf5fb5f754f33a117"},{"id":"func/WalletAddrs.run","name":"WalletAddrs.run","line":23,"end_line":37,"hash":"50aa93fa4873085b8bac34a6153d45a9adf36c816daf042a660a12d1d36ca502"},{"id":"func/WalletAddrs.validateFlags","name":"WalletAddrs.validateFlags","line":39,"end_line":43,"hash":"fac8d97b616886f6174debf90ef3507e12969edc27df3a844b5f027c242bc73d"},{"id":"func/WalletAddrs.getAddrs","name":"WalletAddrs.getAddrs","line":45,"end_line":62,"hash":"d3016455d194570faf0184aea92f2e60325891bb8921b77e479e9ffb31bef842"}]}
// mutate4javascript-manifest-end
