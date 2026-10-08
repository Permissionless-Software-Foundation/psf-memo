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

// Define a single-field write command. Each command supplies its flag parser,
// formatter, action prefix, and field name; this factory owns the wiring and
// broadcasts the one field through the shared scaffolding.
export function defineFieldWriteCommand ({ parse, format, prefix, field }) {
  return class {
    constructor (options = {}) {
      initWriteCommand(this, options)
    }

    // Validate the field, resolve the wallet, broadcast it, and report.
    async run (flags = {}) {
      return runWriteCommand({ command: this, flags, parse, format })
    }

    // Validate the field text. The wallet source is validated by the shared
    // resolver during run. Returns true when the field is usable.
    validateFlags (flags = {}) {
      parse(flags)
      return true
    }

    // Broadcast the single-field Memo action through the shared scaffolding.
    post ({ wallet, ...fields }) {
      return this.broadcast({ wallet, prefix, fields: [fields[field]] })
    }
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-07T18:26:13.797Z","module_hash":"04a4480b18ad2bff2071a0d9a2f0fc6ffa2a71336f2ebd9377cd4ee23579669f","functions":[{"id":"func/initWriteCommand","name":"initWriteCommand","line":20,"end_line":35,"hash":"eddd6c0ca5a4f408a6086f454e68849e92d5830860b9cfabb9e0706f1e277e52"},{"id":"func/runWriteCommand","name":"runWriteCommand","line":41,"end_line":64,"hash":"9e73b355dbe23e25cc4cf2595e65508c7d4f9a0e93de3375d60695f448e2c1a5"}]}
// mutate4javascript-manifest-end
