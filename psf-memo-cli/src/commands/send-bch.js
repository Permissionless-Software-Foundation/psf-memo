/*
  Command to send BCH to a given address.
*/

// Global npm libraries

// Local libraries
import WalletUtil from '../lib/wallet-util.js'

class SendBch {
  constructor () {
    // Encapsulate dependencies
    this.walletUtil = new WalletUtil()
    this.bchWallet = {} // Placeholder for instance of wallet.

    // Bind 'this' object to all subfunctions.
    this.run = this.run.bind(this)
    this.validateFlags = this.validateFlags.bind(this)
    this.sendBch = this.sendBch.bind(this)
  }

  async run (flags) {
    try {
      this.validateFlags(flags)

      // Initialize the wallet.
      this.bchWallet = await this.walletUtil.instanceWallet(flags.name)

      // Send the BCH
      const txid = await this.sendBch(flags)

      console.log(`TXID: ${txid}`)
      console.log('\nView this transaction on a block explorer:')
      console.log(`https://bch.loping.net/tx/${txid}`)

      return true
    } catch (err) {
      console.error('Error in send-bch: ', err)
      return 0
    }
  }

  validateFlags (flags = {}) {
    // Exit if wallet not specified.
    const name = flags.name
    if (!name || name === '') {
      throw new Error('You must specify a wallet name with the -n flag.')
    }

    // Exit if wallet not specified.
    const addr = flags.addr
    if (!addr || addr === '') {
      throw new Error('You must specify a receiver address with the -a flag.')
    }

    // Exit if quantity not specified.
    const qty = flags.qty
    if (!qty || qty === '') {
      throw new Error('You must specify a quantity in BCH with the -q flag.')
    }

    return true
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
// {"version":1,"tested_at":"2026-10-06T22:18:29.186Z","module_hash":"b8ededff1a747c9d7cdecbe01c8b0788d5d6456ad2524feeb129f41c2efcd605","functions":[{"id":"func/SendBch.constructor","name":"SendBch.constructor","line":11,"end_line":20,"hash":"38695ef9eb730ed1a4ae95a5feb362d2a333997ec9d7e1b747bc534dc132d1b7"},{"id":"func/SendBch.run","name":"SendBch.run","line":22,"end_line":41,"hash":"55033c839dea3e73e8ec60dd075e9e163b496bb27c8e9968440bcbcad32df06b"},{"id":"func/SendBch.validateFlags","name":"SendBch.validateFlags","line":43,"end_line":63,"hash":"3038052cbad8a234f6ce8f77cabde2d097b20288a23f3b7449f10eb9ad80da18"},{"id":"func/SendBch.sendBch","name":"SendBch.sendBch","line":67,"end_line":95,"hash":"abc593006c75e67090b61851abbc842db64bc3fccc76d51900b4f51d28960047"}]}
// mutate4javascript-manifest-end
