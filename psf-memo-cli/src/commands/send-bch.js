/*
  Command to send BCH to a given address.
*/

// Local libraries
import { initWalletCommand } from '../lib/init-command.js'
import { runSendCommand } from '../lib/send-command.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'

class SendBch {
  constructor (options = {}) {
    initWalletCommand(this, options, ['sendBch'], { bchWallet: {} })
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T18:43:39.634Z","module_hash":"b19f190cf25440030fa2a349ed9d4088676959fd5ddb5f88263f8ef8f00bcad8","functions":[{"id":"func/SendBch.constructor","name":"SendBch.constructor","line":11,"end_line":13,"hash":"a81fac6adbcd03a5ab8a777a54e721b728406c6171766a0947b3da32d7db499f"},{"id":"func/SendBch.run","name":"SendBch.run","line":15,"end_line":22,"hash":"67448fb81f71104d9ea89c359d9033da7127a9fb640446ea8f5e8bf3e487cbde"},{"id":"func/SendBch.validateFlags","name":"SendBch.validateFlags","line":24,"end_line":30,"hash":"710e2891ce5cbf115f6eea04b6fb8a8bd6066dfb79542d166b49b4d83b72da49"},{"id":"func/SendBch.sendBch","name":"SendBch.sendBch","line":34,"end_line":54,"hash":"c07845cfff73a88e4eb1f5e62326e86198c8b0f7e1ad4dd6a7638a139b08ee7f"}]}
// mutate4javascript-manifest-end
