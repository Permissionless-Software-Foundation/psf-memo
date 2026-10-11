/*
  This command sweeps a private key in WIF format, and transfers any BCH or SLP
  tokens to the wallet.

  If only SLP tokens held by the private key, the wallet will need some BCH to
  pay TX fees for sweeping the tokens. If the private key has BCH, those
  funds will be used for TX fees.
*/

// Global npm libraries
import BchTokenSweep from 'bch-token-sweep'

// Local libraries
import { initWalletCommand } from '../lib/init-command.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'
import { runCommand } from '../lib/reporter.js'

const SWEEP_EXPLORER_URL = 'https://bch.loping.net/tx/'

class WalletSweep {
  constructor (options = {}) {
    initWalletCommand(this, options, ['sweepWif'], { BchTokenSweep: options.BchTokenSweep || BchTokenSweep })
  }

  async run (flags = {}) {
    const code = await runCommand(async () => {
      this.validateFlags(flags)

      // Initialize the wallet.
      this.bchWallet = await this.walletUtil.instanceWallet(flags.name)

      // Sweep any BCH and tokens from the private key.
      const txid = await this.sweepWif(flags)
      const explorerUrl = `${SWEEP_EXPLORER_URL}${txid}`

      return {
        message: [
          'BCH successfully swept from the private key',
          `TXID: ${txid}`,
          '',
          'View this transaction on a block explorer:',
          explorerUrl
        ].join('\n'),
        data: { txid, explorerUrl }
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
      [flags.wif, 'You must specify a private key to sweep with the -w flag.']
    ])
  }

  async sweepWif (flags) {
    const walletWif = this.bchWallet.walletInfo.privateKey

    // Prepare the BCH Token Sweep library.
    const sweeper = new this.BchTokenSweep(
      flags.wif,
      walletWif,
      this.bchWallet
    )
    await sweeper.populateObjectFromNetwork()

    // Sweep the private key
    const hex = await sweeper.sweepTo(this.bchWallet.walletInfo.slpAddress)

    // Broadcast the transaction.
    const txid = await this.bchWallet.ar.sendTx(hex)

    return txid
  }
}

export default WalletSweep

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T18:50:17.247Z","module_hash":"f52757281d7d55d87ce81bb2a5d2ba5c32ee9f98b194c7799e3d9975fd076658","functions":[{"id":"func/WalletSweep.constructor","name":"WalletSweep.constructor","line":21,"end_line":23,"hash":"867c777c403ea1b1c81bd5849e90eef401f33e19ceaf4a00aeeadb0e0c3c075d"},{"id":"func/WalletSweep.run","name":"WalletSweep.run","line":25,"end_line":54,"hash":"a3ec1d3033400fbbe72535eac864698ff3c6f543ad25a98af81552507666cf37"},{"id":"func/WalletSweep.validateFlags","name":"WalletSweep.validateFlags","line":56,"end_line":61,"hash":"a3476b3118f86e162fdc8eef030d4d2b9af24b05f197346fed6bee59ea98fe87"},{"id":"func/WalletSweep.sweepWif","name":"WalletSweep.sweepWif","line":63,"end_line":81,"hash":"d2fe93671f607738ce7da9674bd7c90256eb9dfca9a0bfb446938663202b0c45"}]}
// mutate4javascript-manifest-end
