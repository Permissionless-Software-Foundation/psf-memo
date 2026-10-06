/*
  Cryptographically sign a message with your private key.
*/

// Global npm libraries

// Local libraries
import WalletUtil from '../lib/wallet-util.js'

class MsgSign {
  constructor () {
    // Encapsulate Dependencies
    this.walletUtil = new WalletUtil()

    // Bind 'this' object to all subfunctions.
    this.run = this.run.bind(this)
    this.validateFlags = this.validateFlags.bind(this)
    this.sign = this.sign.bind(this)
  }

  async run (flags) {
    try {
      this.validateFlags(flags)

      // Initialize the wallet.
      this.bchWallet = await this.walletUtil.instanceWallet(flags.name)

      // Sweep any BCH and tokens from the private key.
      const signObj = await this.sign(flags)

      console.log('Signed message with key associated with this address: ', signObj.bchAddr)
      console.log(`Input message: ${signObj.msg}`)
      console.log('Signature:')
      console.log(signObj.signature)

      return true
    } catch (err) {
      console.error('Error in msg-sign: ', err)
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
    const msg = flags.msg
    if (!msg || msg === '') {
      throw new Error('You must specify a message to sign with the -m flag.')
    }

    return true
  }

  async sign (flags) {
    try {
      const walletWif = this.bchWallet.walletInfo.privateKey

      const signature = this.bchWallet.bchjs.BitcoinCash.signMessageWithPrivKey(
        walletWif,
        flags.msg
      )

      const outObj = {
        signature,
        bchAddr: this.bchWallet.walletInfo.cashAddress,
        msg: flags.msg
      }

      return outObj
    } catch (err) {
      console.error('Error in sign()')
      throw err
    }
  }
}

export default MsgSign

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-06T22:17:59.533Z","module_hash":"ec3449b4cce0e637c2b1d2d3d71f6b3500a886aaa6033a5e8702639b67cb6757","functions":[{"id":"func/MsgSign.constructor","name":"MsgSign.constructor","line":11,"end_line":19,"hash":"0e3774dbfbf4001836d57b8d75edbdf01521651eec646e584b9d0a860dd0401e"},{"id":"func/MsgSign.run","name":"MsgSign.run","line":21,"end_line":41,"hash":"cd5e5ff22f6bcc5ffee5471aec8438549e9040cbb04e71a06f318e534c68d5b8"},{"id":"func/MsgSign.validateFlags","name":"MsgSign.validateFlags","line":43,"end_line":57,"hash":"1bc81ab68b50b054326d546ba3754544f1459c3b658730c635a50c581be46514"},{"id":"func/MsgSign.sign","name":"MsgSign.sign","line":59,"end_line":79,"hash":"0f86e0c35c7159cc2090efbe7409ca142168d3b92c64a6a1bb788af8d1ce8caa"}]}
// mutate4javascript-manifest-end
