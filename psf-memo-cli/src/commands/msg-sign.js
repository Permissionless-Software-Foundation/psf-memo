/*
  Cryptographically sign a message with your private key.
*/

// Local libraries
import WalletUtil from '../lib/wallet-util.js'
import { bindMethods } from '../lib/bind-methods.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'
import { runCommand } from '../lib/reporter.js'

class MsgSign {
  constructor ({ walletUtil, stdout, stderr } = {}) {
    // Encapsulate dependencies
    this.walletUtil = walletUtil || new WalletUtil()
    this.stdout = stdout
    this.stderr = stderr

    // Bind 'this' object to all subfunctions.
    bindMethods(this, ['run', 'validateFlags', 'sign'])
  }

  async run (flags = {}) {
    const code = await runCommand(async () => {
      this.validateFlags(flags)

      // Initialize the wallet.
      this.bchWallet = await this.walletUtil.instanceWallet(flags.name)

      const signObj = await this.sign(flags)

      return {
        message: [
          `Signed message with key associated with this address:  ${signObj.bchAddr}`,
          `Input message: ${signObj.msg}`,
          'Signature:',
          signObj.signature
        ].join('\n'),
        data: {
          cashAddress: signObj.bchAddr,
          message: signObj.msg,
          signature: signObj.signature
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
      [flags.name, 'You must specify a wallet name with the -n flag.'],
      [flags.msg, 'You must specify a message to sign with the -m flag.']
    ])
  }

  async sign (flags) {
    const walletWif = this.bchWallet.walletInfo.privateKey

    const signature = this.bchWallet.bchjs.BitcoinCash.signMessageWithPrivKey(
      walletWif,
      flags.msg
    )

    return {
      signature,
      bchAddr: this.bchWallet.walletInfo.cashAddress,
      msg: flags.msg
    }
  }
}

export default MsgSign
