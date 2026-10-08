/*
  memo-following: read the addresses a wallet follows.

  A read-only command for the psf-memo-db GET /follow/following/:addr route. It
  resolves the signing wallet (-n <wallet> or --wif <wif>) to the follower
  address and reports the returned followee cash addresses. The list is
  unpaginated. A missing wallet source is a usage error (exit 2); a failed
  request is an error (exit 1). No broadcast.
*/

// Local libraries
import { defineWalletListCommand } from '../lib/wallet-list-command.js'

const MemoFollowing = defineWalletListCommand({
  readMethod: 'readFollowing',
  clientMethod: 'getFollowing',
  listField: 'following',
  label: 'following'
})

export default MemoFollowing

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T01:28:43.877Z","module_hash":"bec8f5b6714b828941ec3735c3313d38b2fbe96fbd164a4698a63a59f92d825c","functions":[]}
// mutate4javascript-manifest-end
