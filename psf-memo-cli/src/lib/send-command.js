/*
  Shared scaffolding for commands that broadcast a transaction and then report
  a block-explorer link.

  Each command supplies its own flag validation, wallet initialization, send
  implementation, and explorer URL. The success and error output goes through
  the shared reporter, so the command supports --json, reports usage failures
  as exit 2 and runtime failures as exit 1, and keeps its human-readable output.
*/

// Local libraries
import { runCommand } from './reporter.js'

// Validate, initialize the wallet, run the send implementation, and report the
// resulting TXID. Returns the exit code (0/1/2) and assigns it to
// process.exitCode.
export async function runSendCommand ({ command, flags, send, explorerUrl }) {
  const code = await runCommand(async () => {
    command.validateFlags(flags)

    // Initialize the wallet.
    command.bchWallet = await command.walletUtil.instanceWallet(flags.name)

    const txid = await send(flags)
    const url = `${explorerUrl}${txid}`

    return {
      message: `TXID: ${txid}\n\nView this transaction on a block explorer:\n${url}`,
      data: { txid, explorerUrl: url }
    }
  }, {
    json: flags.json,
    stdout: command.stdout,
    stderr: command.stderr
  })

  process.exitCode = code
  return code
}
