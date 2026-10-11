/*
  List the addresses of a wallet.
*/

// Global npm libraries
import { readFile as readFileImpl } from 'fs/promises'

// Local libraries
import { initCommand } from '../lib/init-command.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'
import { runCommand } from '../lib/reporter.js'

// Global variables
const __dirname = import.meta.dirname

class WalletAddrs {
  constructor (options = {}) {
    initCommand(this, options, ['getAddrs'], { readFile: options.readFile || readFileImpl })
  }

  async run (flags = {}) {
    const code = await runCommand(async () => {
      this.validateFlags(flags)

      // Generate a filename for the wallet file.
      const filename = `${__dirname.toString()}/../../.wallets/${
        flags.name
      }.json`

      const walletData = await this.getAddrs(filename)

      return {
        message: [
          ' ',
          `Cash Address: ${walletData.cashAddress}`,
          `SLP Address: ${walletData.slpAddress}`,
          `Legacy Address: ${walletData.legacyAddress}`,
          ' '
        ].join('\n'),
        data: {
          cashAddress: walletData.cashAddress,
          slpAddress: walletData.slpAddress,
          legacyAddress: walletData.legacyAddress
        }
      }
    }, {
      json: flags.json,
      stdout: this.stdout,
      stderr: this.stderr
    })

    process.exitCode = code
    return code
  }

  validateFlags (flags = {}) {
    return validateRequiredFlags([
      [flags.name, 'You must specify a wallet name with the -n flag.']
    ])
  }

  async getAddrs (filename) {
    // Load the wallet file.
    const walletStr = await this.readFile(filename)
    let walletData = JSON.parse(walletStr)
    walletData = walletData.wallet

    return walletData
  }
}

export default WalletAddrs

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T18:37:56.990Z","module_hash":"1ef4c884cc7f32c11fa40ba150d43915a7948f025aff68f3ee663cae772c2f9d","functions":[{"id":"func/WalletAddrs.constructor","name":"WalletAddrs.constructor","line":17,"end_line":19,"hash":"5bf316505aff1f59f78c386a72e66fa1873f0bdf2fc3b814335ba7d0a8b7c584"},{"id":"func/WalletAddrs.run","name":"WalletAddrs.run","line":21,"end_line":54,"hash":"0789f36567d4656a69c7caca3ca8e0c1078ca89ea33369e48f57abd07f3f9766"},{"id":"func/WalletAddrs.validateFlags","name":"WalletAddrs.validateFlags","line":56,"end_line":60,"hash":"30f3abcad0c161990ba603b85114028f03c80fa51bc831d5b19bfbec8c247177"},{"id":"func/WalletAddrs.getAddrs","name":"WalletAddrs.getAddrs","line":62,"end_line":69,"hash":"8d160f6120232130533bc29f1d1f7734cfc0db550eb5e17ec8a374c25755332f"}]}
// mutate4javascript-manifest-end
