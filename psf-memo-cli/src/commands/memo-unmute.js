/*
  memo-unmute: broadcast a 0x6d17 Memo unmute action.

  It resolves the signing wallet (-n <wallet> or --wif <wif>), requires the
  mutee cash address (-a), converts it to its 20-byte hash160 in display order
  (never byte-reversed), broadcasts the single-field Memo action
  [6d17, hash160] through the shared broadcast scaffolding, and reports the
  transaction id plus its bch.loping.net explorer link. A missing or malformed
  address is a usage error (exit 2) with no broadcast; a rejected broadcast
  surfaces the wallet's real error (exit 1). Persistence depends on the
  psf-memo-db mute entity route.
*/

// Local libraries
import { defineAddressWriteCommand } from '../lib/address-write-command.js'

const MemoUnmute = defineAddressWriteCommand({
  prefix: '6d17',
  missingMessage: 'You must specify a mutee address with the -a flag.',
  verb: 'Unmuted'
})

export default MemoUnmute
