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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T18:41:54.251Z","module_hash":"015038ad081de2e64d5899cfd8cb6fb487658b0b4bfc0509429f648d038b5508","functions":[{"id":"func/runSendCommand","name":"runSendCommand","line":17,"end_line":39,"hash":"f3be62479bdc947e319821fff8f180990dfc70da31a71763a489cdddc7c0f6ee"}]}
// mutate4javascript-manifest-end
