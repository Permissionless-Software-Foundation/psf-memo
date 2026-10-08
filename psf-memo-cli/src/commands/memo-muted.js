/*
  memo-muted: read the addresses a wallet has muted.

  A read-only command for the psf-memo-db GET /mute/muted/:addr route. It
  resolves the signing wallet (-n <wallet> or --wif <wif>) to the muter address
  and reports the returned mutee cash addresses. The list is unpaginated. A
  missing wallet source is a usage error (exit 2); a failed request is an error
  (exit 1). No broadcast.
*/

// Local libraries
import { defineWalletListCommand } from '../lib/wallet-list-command.js'

const MemoMuted = defineWalletListCommand({
  readMethod: 'readMuted',
  clientMethod: 'getMuted',
  listField: 'muted',
  label: 'muted'
})

export default MemoMuted

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:46:08.711Z","module_hash":"2c6cd0155bcd7c56e75699938501cf49193e4e13cdced0453c7d8275826f01f9","functions":[]}
// mutate4javascript-manifest-end
