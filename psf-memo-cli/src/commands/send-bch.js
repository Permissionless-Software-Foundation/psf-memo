/*
  Command to send BCH to a given address.
*/

// Global npm libraries

// Local libraries
import WalletUtil from '../lib/wallet-util.js'
import { bindMethods } from '../lib/bind-methods.js'
import { runSendCommand } from '../lib/send-command.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'

class SendBch {
  constructor () {
    // Encapsulate dependencies
    this.walletUtil = new WalletUtil()
    this.bchWallet = {} // Placeholder for instance of wallet.

    // Bind 'this' object to all subfunctions.
    bindMethods(this, ['run', 'validateFlags', 'sendBch'])
  }

  async run (flags) {
    return runSendCommand({
      command: this,
      flags,
      send: this.sendBch,
      explorerUrl: 'https://bch.loping.net/tx/',
      errorLabel: 'send-bch'
    })
  }

  validateFlags (flags = {}) {
    return validateRequiredFlags([
      [flags.name, 'You must specify a wallet name with the -n flag.'],
      [flags.addr, 'You must specify a receiver address with the -a flag.'],
      [flags.qty, 'You must specify a quantity in BCH with the -q flag.']
    ])
  }

  // Give an instance of a wallet, an address, and a quantity, send the BCH.
  // Returns a TXID from a broadcasted transaction.
  async sendBch (flags) {
    try {
      // Update the wallet UTXOs.
      await this.bchWallet.initialize()

      const walletBalance = await this.bchWallet.getBalance()
      // console.log('walletBalance: ', walletBalance)

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

      const txid = await this.bchWallet.send(receivers)

      return txid
    } catch (err) {
      console.error('Error in sendBCH()')
      throw err
    }
  }
}

export default SendBch

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-06T22:45:17.705Z","module_hash":"ca4c1399676534dd187b4f0126821a5d8fd22956750c613f79f1d59ce43cf676","functions":[{"id":"func/SendBch.constructor","name":"SendBch.constructor","line":14,"end_line":21,"hash":"2966924b3c6220be2885324710d0a92e658521600a3a7f5962d3edb40496337f"},{"id":"func/SendBch.run","name":"SendBch.run","line":23,"end_line":31,"hash":"7fbe134d9dba2d618e8ead01e13ac852d791481c55eebccb7e0fdc2311370c47"},{"id":"func/SendBch.validateFlags","name":"SendBch.validateFlags","line":33,"end_line":39,"hash":"710e2891ce5cbf115f6eea04b6fb8a8bd6066dfb79542d166b49b4d83b72da49"},{"id":"func/SendBch.sendBch","name":"SendBch.sendBch","line":43,"end_line":71,"hash":"abc593006c75e67090b61851abbc842db64bc3fccc76d51900b4f51d28960047"}]}
// mutate4javascript-manifest-end
