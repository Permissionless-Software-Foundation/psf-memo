/*
  Create a new wallet.
*/

// Global npm libraries
import BchWallet from 'minimal-slp-wallet'

// Local libraries
import { initWalletCommand } from '../lib/init-command.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'
import { runCommand } from '../lib/reporter.js'

// Global variables
const __dirname = import.meta.dirname

class WalletCreate {
  constructor (options = {}) {
    initWalletCommand(this, options, ['createWallet'], { BchWallet: options.BchWallet || BchWallet })
  }

  async run (flags = {}) {
    const code = await runCommand(async () => {
      this.validateFlags(flags)

      const description = flags.description || ''

      // Generate a filename for the wallet file.
      const filename = `${__dirname.toString()}/../../.wallets/${
        flags.name
      }.json`

      const walletData = await this.createWallet(filename, description)

      return {
        message: `wallet-create executed with name ${flags.name} and description ${description}`,
        data: {
          name: flags.name,
          description,
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

  // Create a new wallet file.
  async createWallet (filename, desc) {
    if (!filename || typeof filename !== 'string') {
      throw new Error('filename required.')
    }

    if (!desc) desc = ''

    // Configure the minimal-slp-wallet library to use the JSON RPC over IPFS.
    const advancedConfig = {}
    advancedConfig.noUpdate = true

    // Wait for the wallet to be created.
    this.bchWallet = new this.BchWallet(undefined, advancedConfig)
    await this.bchWallet.walletInfoPromise

    // Create the initial wallet JSON object.
    const walletData = {
      wallet: this.bchWallet.walletInfo
    }
    walletData.wallet.description = desc

    // Write out the basic information into a json file for other apps to use.
    await this.walletUtil.saveWallet(filename, walletData)

    return walletData.wallet
  }
}

export default WalletCreate

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T18:46:08.311Z","module_hash":"78b06791bcdb096f63f94c5ccdbeaeaf5b1b587baa2ffdd399b05fde653eb2c6","functions":[{"id":"func/WalletCreate.constructor","name":"WalletCreate.constructor","line":17,"end_line":19,"hash":"46389899802cd3ae4495c3676915b9d3567e47b0c5e07ee4e1cf8e1ca916cb07"},{"id":"func/WalletCreate.run","name":"WalletCreate.run","line":21,"end_line":52,"hash":"66f7438d888a88be4819ffbda98c34bcce110205c68d3a066f30da3d12a9762d"},{"id":"func/WalletCreate.validateFlags","name":"WalletCreate.validateFlags","line":54,"end_line":58,"hash":"30f3abcad0c161990ba603b85114028f03c80fa51bc831d5b19bfbec8c247177"},{"id":"func/WalletCreate.createWallet","name":"WalletCreate.createWallet","line":61,"end_line":86,"hash":"7e0eb80c93c7f235008fd822753f64c0af544b0b2689e39c08f6cfe28e429444"}]}
// mutate4javascript-manifest-end
