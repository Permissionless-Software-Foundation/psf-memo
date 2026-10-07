/*
  Shared scaffolding for memo-* broadcast write commands.

  Each command supplies its own flag parsing, action prefix, and field builder.
  This module owns the dependency wiring and the validate -> resolve wallet ->
  broadcast -> report pipeline, mirroring read-command.js for the read path and
  keeping the write commands thin.
*/

// Local libraries
import { runCommand } from './reporter.js'
import { resolveWalletSource } from './wallet-source.js'
import { broadcastMemo } from './memo-broadcast.js'
import WalletUtil from './wallet-util.js'
import { bindMethods } from './bind-methods.js'

// Wire the shared write-command dependencies onto `command` and bind its
// methods -- including the supplied post method -- so they survive commander's
// callback dispatch.
export function initWriteCommand (command, {
  walletUtil,
  broadcast,
  stdout,
  stderr
} = {}) {
  // Encapsulate dependencies so tests and acceptance can inject a fake wallet
  // source, broadcast, and output streams instead of touching the network or
  // a real wallet file.
  command.walletUtil = walletUtil || new WalletUtil()
  command.broadcast = broadcast || broadcastMemo
  command.stdout = stdout
  command.stderr = stderr

  bindMethods(command, ['run', 'validateFlags', 'post'])
}

// Validate a write command's flags, resolve the signing wallet, broadcast the
// fields the command builds, and report the txid and explorer link. `parse`
// returns the broadcast fields; `format` renders the human-readable summary.
// Returns the exit code (0/1/2) and assigns it to process.exitCode.
export async function runWriteCommand ({ command, flags, parse, format }) {
  const code = await runCommand(async () => {
    const fields = parse(flags)

    const { wallet } = await resolveWalletSource(
      { name: flags.name, wif: flags.wif },
      { walletUtil: command.walletUtil }
    )

    const { txid, explorerUrl } = await command.post({ wallet, ...fields })

    return {
      message: format({ txid, explorerUrl }),
      data: { txid, explorerUrl }
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
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
