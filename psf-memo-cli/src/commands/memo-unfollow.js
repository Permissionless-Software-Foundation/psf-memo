/*
  memo-unfollow: broadcast a 0x6d07 Memo unfollow action.

  It resolves the signing wallet (-n <wallet> or --wif <wif>), requires the
  followee cash address (-a), converts it to its 20-byte hash160 in display
  order (never byte-reversed), broadcasts the single-field Memo action
  [6d07, hash160] through the shared broadcast scaffolding, and reports the
  transaction id plus its bch.loping.net explorer link. A missing or malformed
  address is a usage error (exit 2) with no broadcast; a rejected broadcast
  surfaces the wallet's real error (exit 1).
*/

// Local libraries
import { defineAddressWriteCommand } from '../lib/address-write-command.js'

const MemoUnfollow = defineAddressWriteCommand({
  prefix: '6d07',
  missingMessage: 'You must specify a followee address with the -a flag.',
  verb: 'Unfollowed'
})

export default MemoUnfollow

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T02:22:57.547Z","module_hash":"423bb549296edbb9ae3562ad801d5e057ceb72ac26f8d9edb1579f30d137e1cc","functions":[]}
// mutate4javascript-manifest-end
