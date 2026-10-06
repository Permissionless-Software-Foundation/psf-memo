/*
  Cryptographically sign a message with your private key.
*/

// Global npm libraries

// Local libraries
import WalletUtil from '../lib/wallet-util.js'
import { bindMethods } from '../lib/bind-methods.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'

class MsgSign {
  constructor () {
    // Encapsulate Dependencies
    this.walletUtil = new WalletUtil()

    // Bind 'this' object to all subfunctions.
    bindMethods(this, ['run', 'validateFlags', 'sign'])
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
    return validateRequiredFlags([
      [flags.name, 'You must specify a wallet name with the -n flag.'],
      [flags.msg, 'You must specify a message to sign with the -m flag.']
    ])
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
// {"version":1,"tested_at":"2026-10-06T22:44:53.798Z","module_hash":"bcbf737e1b5a5f3518fd2998f9992a82e8950786afe5bf6a0657ee0da44043bc","functions":[{"id":"func/MsgSign.constructor","name":"MsgSign.constructor","line":13,"end_line":19,"hash":"001dbfc0437af2e9663bc384ff00a8da5d1b223e31f28792e7d35b7c443bf6cd"},{"id":"func/MsgSign.run","name":"MsgSign.run","line":21,"end_line":41,"hash":"cd5e5ff22f6bcc5ffee5471aec8438549e9040cbb04e71a06f318e534c68d5b8"},{"id":"func/MsgSign.validateFlags","name":"MsgSign.validateFlags","line":43,"end_line":48,"hash":"0d7781b2dfd5a6ecf25940ae7aa5912b0779d17e2d56cd48e5967d28f7f90337"},{"id":"func/MsgSign.sign","name":"MsgSign.sign","line":50,"end_line":70,"hash":"0f86e0c35c7159cc2090efbe7409ca142168d3b92c64a6a1bb788af8d1ce8caa"}]}
// mutate4javascript-manifest-end
