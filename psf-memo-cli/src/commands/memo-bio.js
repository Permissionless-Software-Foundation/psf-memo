/*
  memo-bio: broadcast a 0x6d05 Memo set-profile-text action.

  It resolves the signing wallet (-n <wallet> or --wif <wif>), validates the bio
  against the 0x6d05 protocol limit of 217 UTF-8 bytes (not characters),
  broadcasts the single-field Memo action [6d05, bio] through the shared
  broadcast scaffolding, and reports the transaction id plus its
  bch.loping.net explorer link. A missing or invalid flag is a usage error
  (exit 2) with no broadcast; a rejected broadcast surfaces the wallet's real
  error (exit 1).
*/

// Local libraries
import {
  parseMemoBioFlags,
  formatMemoBioMessage,
  MEMO_BIO_PREFIX
} from '../lib/memo-bio.js'
import { defineFieldWriteCommand } from '../lib/write-command.js'

const MemoBio = defineFieldWriteCommand({
  parse: parseMemoBioFlags,
  format: formatMemoBioMessage,
  prefix: MEMO_BIO_PREFIX,
  field: 'bio'
})

export default MemoBio
