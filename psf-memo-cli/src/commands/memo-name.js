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
import { defineFieldWriteCommand } from '../lib/write-command.js'

const MemoName = defineFieldWriteCommand({
  parse: parseMemoNameFlags,
  format: formatMemoNameMessage,
  prefix: MEMO_NAME_PREFIX,
  field: 'name'
})

export default MemoName

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:46:09.111Z","module_hash":"944011befecf21e6f6e9691bc6ad0d7732f6ff2b04bd74dc919ca927866c9baa","functions":[]}
// mutate4javascript-manifest-end
