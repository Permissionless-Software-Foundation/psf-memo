/*
  memo-mute: broadcast a 0x6d16 Memo mute action.

  It resolves the signing wallet (-n <wallet> or --wif <wif>), requires the
  mutee cash address (-a), converts it to its 20-byte hash160 in display order
  (never byte-reversed), broadcasts the single-field Memo action
  [6d16, hash160] through the shared broadcast scaffolding, and reports the
  transaction id plus its bch.loping.net explorer link. A missing or malformed
  address is a usage error (exit 2) with no broadcast; a rejected broadcast
  surfaces the wallet's real error (exit 1). Persistence depends on the
  psf-memo-db mute entity route.
*/

// Local libraries
import { defineAddressWriteCommand } from '../lib/address-write-command.js'

const MemoMute = defineAddressWriteCommand({
  prefix: '6d16',
  missingMessage: 'You must specify a mutee address with the -a flag.',
  verb: 'Muted'
})

export default MemoMute

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T02:23:08.145Z","module_hash":"a1821a2f78a708c6f785859af751c2f8a2b0c6762a62076981ae43ac25f94101","functions":[]}
// mutate4javascript-manifest-end
