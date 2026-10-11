/*
  Check the balance of a wallet in terms of BCH and SLP tokens.
*/

// Global npm libraries
import BchWallet from 'minimal-slp-wallet'

// Local libraries
import WalletUtil from '../lib/wallet-util.js'
import { bindMethods } from '../lib/bind-methods.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'
import { summarizeBalance, formatBalanceMessage } from '../lib/wallet-balance.js'
import { runCommand } from '../lib/reporter.js'

class WalletBalance {
  constructor ({ BchWallet: WalletClass = BchWallet, walletUtil, stdout, stderr } = {}) {
    // Encapsulate dependencies
    this.BchWallet = WalletClass
    this.walletUtil = walletUtil || new WalletUtil()
    this.stdout = stdout
    this.stderr = stderr

    // Bind 'this' object to all subfunctions.
    bindMethods(this, ['run', 'validateFlags', 'getBalances'])
  }

  async run (flags = {}) {
    const code = await runCommand(async () => {
      this.validateFlags(flags)

      // Initialize the wallet.
      this.bchWallet = await this.walletUtil.instanceWallet(flags.name)
      await this.bchWallet.initialize()

      // Get the wallet with updated UTXO data.
      const walletData = await this.getBalances()
      const summary = summarizeBalance(walletData)

      return {
        message: formatBalanceMessage(summary),
        data: {
          bchBalance: summary.bchBalance,
          tokens: summary.tokens
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

  // Add up the wallet's BCH UTXOs and record the satoshi and BCH balances on
  // the wallet instance. Returns the wallet with the updated fields.
  async getBalances () {
    // Loop through each BCH UTXO and add up the balance.
    let satBalance = 0
    for (let i = 0; i < this.bchWallet.utxos.utxoStore.bchUtxos.length; i++) {
      const thisUtxo = this.bchWallet.utxos.utxoStore.bchUtxos[i]

      satBalance += thisUtxo.value
    }
    const bchBalance = this.bchWallet.bchjs.BitcoinCash.toBitcoinCash(
      satBalance
    )
    this.bchWallet.satBalance = satBalance
    this.bchWallet.bchBalance = bchBalance

    return this.bchWallet
  }
}

export default WalletBalance
