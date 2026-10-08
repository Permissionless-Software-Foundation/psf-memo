/*
  memo-follow: broadcast a 0x6d06 Memo follow action.

  It resolves the signing wallet (-n <wallet> or --wif <wif>), requires the
  followee cash address (-a), converts it to its 20-byte hash160 in display
  order (never byte-reversed), broadcasts the single-field Memo action
  [6d06, hash160] through the shared broadcast scaffolding, and reports the
  transaction id plus its bch.loping.net explorer link. A missing or malformed
  address is a usage error (exit 2) with no broadcast; a rejected broadcast
  surfaces the wallet's real error (exit 1).
*/

// Local libraries
import { defineAddressWriteCommand } from '../lib/address-write-command.js'

const MemoFollow = defineAddressWriteCommand({
  prefix: '6d06',
  missingMessage: 'You must specify a followee address with the -a flag.',
  verb: 'Followed'
})

export default MemoFollow

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T02:22:47.008Z","module_hash":"cb9efb11501767174884499e567f53698bf0ebebcdfc0c9248b37eadbccf5ebd","functions":[]}
// mutate4javascript-manifest-end
