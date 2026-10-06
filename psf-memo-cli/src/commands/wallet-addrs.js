/*
  List the addresses for a wallet
*/

// Global npm libraries
import shelljs from 'shelljs'
import { readFile } from 'fs/promises'

// Global variables
const __dirname = import.meta.dirname

class WalletAddrs {
  constructor () {
    // Encapsulate dependencies
    this.shelljs = shelljs

    // Bind 'this' object to all subfunctions.
    this.run = this.run.bind(this)
    this.validateFlags = this.validateFlags.bind(this)
    this.getAddrs = this.getAddrs.bind(this)
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
    // Exit if wallet not specified.
    const name = flags.name
    if (!name || name === '') {
      throw new Error('You must specify a wallet name with the -n flag.')
    }

    return true
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
// {"version":1,"tested_at":"2026-10-06T22:17:13.916Z","module_hash":"f4654c0a667cf5e4e6b097af1ce778f00757edb019694ce4ea7cbdca6d30317a","functions":[{"id":"func/WalletAddrs.constructor","name":"WalletAddrs.constructor","line":13,"end_line":21,"hash":"a527607b065145ee129a7b5b3d265fd2486ec98d00674bbb30e5e96e71f26ff3"},{"id":"func/WalletAddrs.run","name":"WalletAddrs.run","line":23,"end_line":37,"hash":"50aa93fa4873085b8bac34a6153d45a9adf36c816daf042a660a12d1d36ca502"},{"id":"func/WalletAddrs.validateFlags","name":"WalletAddrs.validateFlags","line":39,"end_line":47,"hash":"8e0b3d7d6ba8ea4bda31ccd48cbc4cbf2a535b43fb8f99622cb608c93b7aa529"},{"id":"func/WalletAddrs.getAddrs","name":"WalletAddrs.getAddrs","line":49,"end_line":66,"hash":"d3016455d194570faf0184aea92f2e60325891bb8921b77e479e9ffb31bef842"}]}
// mutate4javascript-manifest-end
