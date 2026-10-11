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
import WalletUtil from '../lib/wallet-util.js'
import { bindMethods } from '../lib/bind-methods.js'
import { validateRequiredFlags } from '../lib/flag-validator.js'
import { runCommand } from '../lib/reporter.js'

const SWEEP_EXPLORER_URL = 'https://bch.loping.net/tx/'

class WalletSweep {
  constructor ({ BchTokenSweep: SweepClass = BchTokenSweep, walletUtil, stdout, stderr } = {}) {
    // Encapsulate dependencies
    this.BchTokenSweep = SweepClass
    this.walletUtil = walletUtil || new WalletUtil()
    this.stdout = stdout
    this.stderr = stderr

    // Bind 'this' object to all subfunctions.
    bindMethods(this, ['run', 'validateFlags', 'sweepWif'])
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
