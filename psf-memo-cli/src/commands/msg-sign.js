/*
  Cryptographically sign a message with your private key.
*/

// Local libraries
import { initWalletCommand } from '../lib/init-command.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'
import { runCommand } from '../lib/reporter.js'

class MsgSign {
  constructor (options = {}) {
    initWalletCommand(this, options, ['sign'])
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T18:37:57.667Z","module_hash":"c8cbb18813f60a463fa2f59b016a05b0d96a27f622c85f27dfc6997cf2640bea","functions":[{"id":"func/MsgSign.constructor","name":"MsgSign.constructor","line":11,"end_line":13,"hash":"e207891b9f45e51a3d6ba20a4db5f550d69f1432db85868adeabc5b85e73760a"},{"id":"func/MsgSign.run","name":"MsgSign.run","line":15,"end_line":45,"hash":"d562b6e7ef0ba8be8ba6679ca19ec304887b577445808cac7bf79d48cc234ca3"},{"id":"func/MsgSign.validateFlags","name":"MsgSign.validateFlags","line":47,"end_line":52,"hash":"0d7781b2dfd5a6ecf25940ae7aa5912b0779d17e2d56cd48e5967d28f7f90337"},{"id":"func/MsgSign.sign","name":"MsgSign.sign","line":54,"end_line":67,"hash":"6d45e62f1f0bce63f231e7a2102712f0d7267585b2d92129454d75e2a841a776"}]}
// mutate4javascript-manifest-end
