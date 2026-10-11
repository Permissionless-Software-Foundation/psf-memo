/*
  List the addresses of a wallet.
*/

// Global npm libraries
import { readFile as readFileImpl } from 'fs/promises'

// Local libraries
import { bindMethods } from '../lib/bind-methods.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'
import { runCommand } from '../lib/reporter.js'

// Global variables
const __dirname = import.meta.dirname

class WalletAddrs {
  constructor ({ readFile = readFileImpl, stdout, stderr } = {}) {
    // Encapsulate dependencies
    this.readFile = readFile
    this.stdout = stdout
    this.stderr = stderr

    // Bind 'this' object to all subfunctions.
    bindMethods(this, ['run', 'validateFlags', 'getAddrs'])
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
