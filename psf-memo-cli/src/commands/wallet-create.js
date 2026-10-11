/*
  Create a new wallet.
*/

// Global npm libraries
import BchWallet from 'minimal-slp-wallet'

// Local libraries
import WalletUtil from '../lib/wallet-util.js'
import { bindMethods } from '../lib/bind-methods.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'
import { runCommand } from '../lib/reporter.js'

// Global variables
const __dirname = import.meta.dirname

class WalletCreate {
  constructor ({ BchWallet: WalletClass = BchWallet, walletUtil, stdout, stderr } = {}) {
    // Encapsulate all dependencies
    this.BchWallet = WalletClass
    this.walletUtil = walletUtil || new WalletUtil()
    this.stdout = stdout
    this.stderr = stderr

    // Bind 'this' object to all subfunctions
    bindMethods(this, ['run', 'validateFlags', 'createWallet'])
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
