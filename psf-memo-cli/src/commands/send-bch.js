/*
  Command to send BCH to a given address.
*/

// Local libraries
import WalletUtil from '../lib/wallet-util.js'
import { bindMethods } from '../lib/bind-methods.js'
import { runSendCommand } from '../lib/send-command.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'

class SendBch {
  constructor ({ walletUtil, stdout, stderr } = {}) {
    // Encapsulate dependencies
    this.walletUtil = walletUtil || new WalletUtil()
    this.bchWallet = {} // Placeholder for instance of wallet.
    this.stdout = stdout
    this.stderr = stderr

    // Bind 'this' object to all subfunctions.
    bindMethods(this, ['run', 'validateFlags', 'sendBch'])
  }

  async run (flags = {}) {
    return runSendCommand({
      command: this,
      flags,
      send: this.sendBch,
      explorerUrl: 'https://bch.loping.net/tx/'
    })
  }

  validateFlags (flags = {}) {
    return validateRequiredFlags([
      [flags.name, 'You must specify a wallet name with the -n flag.'],
      [flags.addr, 'You must specify a receiver address with the -a flag.'],
      [flags.qty, 'You must specify a quantity in BCH with the -q flag.']
    ])
  }

  // Given an instance of a wallet, an address, and a quantity, send the BCH.
  // Returns a TXID from a broadcasted transaction.
  async sendBch (flags) {
    // Update the wallet UTXOs.
    await this.bchWallet.initialize()

    const walletBalance = await this.bchWallet.getBalance()

    if (walletBalance < flags.qty) {
      throw new Error(
        `Insufficient funds. You are trying to send ${flags.qty} BCH, but the wallet only has ${walletBalance} BCH`
      )
    }

    const receivers = [
      {
        address: flags.addr,
        amountSat: this.bchWallet.bchjs.BitcoinCash.toSatoshi(flags.qty)
      }
    ]

    return this.bchWallet.send(receivers)
  }
}

export default SendBch
