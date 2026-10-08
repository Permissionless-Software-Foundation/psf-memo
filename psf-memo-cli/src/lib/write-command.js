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

// Define a multi-field write command. Each command supplies its flag parser,
// formatter, action prefix, and ordered field names; this factory owns the
// wiring and broadcasts those fields through the shared scaffolding.
export function defineFieldsWriteCommand ({ parse, format, prefix, fields }) {
  return class {
    constructor (options = {}) {
      initWriteCommand(this, options)
    }

    // Validate the fields, resolve the wallet, broadcast them, and report.
    async run (flags = {}) {
      return runWriteCommand({ command: this, flags, parse, format })
    }

    // Validate the fields. The wallet source is validated by the shared
    // resolver during run. Returns true when the fields are usable.
    validateFlags (flags = {}) {
      parse(flags)
      return true
    }

    // Broadcast the ordered fields through the shared scaffolding.
    post ({ wallet, ...values }) {
      return this.broadcast({ wallet, prefix, fields: fields.map((name) => values[name]) })
    }
  }
}

// Define a single-field write command as the one-field case of the multi-field
// factory.
export function defineFieldWriteCommand ({ parse, format, prefix, field }) {
  return defineFieldsWriteCommand({ parse, format, prefix, fields: [field] })
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:59:59.203Z","module_hash":"2222992bd44fe4c54bee7b8ca187e1866bf5aa451a1fb8bdaaa5f9d9ce87325b","functions":[{"id":"func/initWriteCommand","name":"initWriteCommand","line":20,"end_line":35,"hash":"eddd6c0ca5a4f408a6086f454e68849e92d5830860b9cfabb9e0706f1e277e52"},{"id":"func/runWriteCommand","name":"runWriteCommand","line":41,"end_line":64,"hash":"9e73b355dbe23e25cc4cf2595e65508c7d4f9a0e93de3375d60695f448e2c1a5"},{"id":"func/defineFieldsWriteCommand","name":"defineFieldsWriteCommand","line":69,"end_line":92,"hash":"79806678d659e8a2936c39ffe036985b2fb9020f1cc1c609fa3ad717e73211bd"},{"id":"func/AnonymousClass.constructor","name":"AnonymousClass.constructor","line":71,"end_line":73,"hash":"10718fa44618a6c0f6b3ec5b4a8283630b46666f3db9383015d681b3819c2eb7"},{"id":"func/AnonymousClass.run","name":"AnonymousClass.run","line":76,"end_line":78,"hash":"9c3e9173bee28588eb031d749d0ccacfbf93bde8e9ab159f7f78cadc5f594d54"},{"id":"func/AnonymousClass.validateFlags","name":"AnonymousClass.validateFlags","line":82,"end_line":85,"hash":"259ea3137c330a79ecc323c94fb6ff343eaf846e8dc9020a68b6b471afc44e29"},{"id":"func/AnonymousClass.post","name":"AnonymousClass.post","line":88,"end_line":90,"hash":"3b6a5511a0b1f7807a4268e5f929f253533dbf277f98347eecbcd358bb540d71"},{"id":"func/defineFieldWriteCommand","name":"defineFieldWriteCommand","line":96,"end_line":98,"hash":"641951a14e6cc7477f85a09f40e202ae3570f72d520061047d24a646fa9ae53d"}]}
// mutate4javascript-manifest-end
