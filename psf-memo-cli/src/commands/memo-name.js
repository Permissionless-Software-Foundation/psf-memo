/*
  memo-name: broadcast a 0x6d01 Memo set-name action.

  It resolves the signing wallet (-n <wallet> or --wif <wif>), validates the
  name against the 0x6d01 protocol limit of 77 UTF-8 bytes (not characters),
  broadcasts the single-field Memo action [6d01, name] through the shared
  broadcast scaffolding, and reports the transaction id plus its
  bch.loping.net explorer link. A missing or invalid flag is a usage error
  (exit 2) with no broadcast; a rejected broadcast surfaces the wallet's real
  error (exit 1).
*/

// Local libraries
import {
  parseMemoNameFlags,
  formatMemoNameMessage,
  MEMO_NAME_PREFIX
} from '../lib/memo-name.js'
import { initWriteCommand, runWriteCommand } from '../lib/write-command.js'

class MemoName {
  constructor (options = {}) {
    initWriteCommand(this, options)
  }

  // Validate the name, resolve the wallet, broadcast the set-name action, and
  // report the txid and explorer link. Returns the exit code (0/1/2).
  async run (flags = {}) {
    return runWriteCommand({
      command: this,
      flags,
      parse: parseMemoNameFlags,
      format: formatMemoNameMessage
    })
  }

  // Validate the name text. The wallet source is validated by the shared
  // resolver during run. Returns true when the name is usable.
  validateFlags (flags = {}) {
    parseMemoNameFlags(flags)
    return true
  }

  // Broadcast the single-field Memo set-name action through the shared
  // scaffolding.
  post ({ wallet, name }) {
    return this.broadcast({
      wallet,
      prefix: MEMO_NAME_PREFIX,
      fields: [name]
    })
  }
}

export default MemoName
