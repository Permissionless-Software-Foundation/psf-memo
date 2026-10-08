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
