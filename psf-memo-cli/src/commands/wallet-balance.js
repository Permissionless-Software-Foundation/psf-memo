/*
  Check the balance of a wallet in terms of BCH and SLP tokens.
*/

// Global npm libraries
import BchWallet from 'minimal-slp-wallet'

// Local libraries
import { initWalletCommand } from '../lib/init-command.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'
import { summarizeBalance, formatBalanceMessage } from '../lib/wallet-balance.js'
import { runCommand } from '../lib/reporter.js'

class WalletBalance {
  constructor (options = {}) {
    initWalletCommand(this, options, ['getBalances'], { BchWallet: options.BchWallet || BchWallet })
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T18:37:57.157Z","module_hash":"18e2d43322ac073552f5ba585d4cbbefef2ec2b6c1ab8f6ecbcedc8a7a673df4","functions":[{"id":"func/WalletBalance.constructor","name":"WalletBalance.constructor","line":15,"end_line":17,"hash":"6e5514088cecbab50ec98b33efeace47157c5beda4710b551429182cf6129e79"},{"id":"func/WalletBalance.run","name":"WalletBalance.run","line":19,"end_line":46,"hash":"a49466c88faf2134e551d47e35eba30528e17a4f8c0048f7c2f043e2f69157b2"},{"id":"func/WalletBalance.validateFlags","name":"WalletBalance.validateFlags","line":48,"end_line":52,"hash":"30f3abcad0c161990ba603b85114028f03c80fa51bc831d5b19bfbec8c247177"},{"id":"func/WalletBalance.getBalances","name":"WalletBalance.getBalances","line":56,"end_line":71,"hash":"07b4ef796e4a3ae3f073461d81fcffdc4ac37ab74b4ee9c77e1b8fd696e2a16b"}]}
// mutate4javascript-manifest-end
