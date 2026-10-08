/*
  memo-muted: read the addresses a wallet has muted.

  A read-only command for the psf-memo-db GET /mute/muted/:addr route. It
  resolves the signing wallet (-n <wallet> or --wif <wif>) to the muter address
  and reports the returned mutee cash addresses. The list is unpaginated. A
  missing wallet source is a usage error (exit 2); a failed request is an error
  (exit 1). No broadcast.
*/

// Local libraries
import { ListReadCommand } from '../lib/list-command.js'
import { parseWalletSourceFlags, formatFollowListMessage } from '../lib/follow-list.js'
import { resolveWalletSource } from '../lib/wallet-source.js'
import WalletUtil from '../lib/wallet-util.js'

class MemoMuted extends ListReadCommand {
  constructor (options = {}) {
    super(options, 'readMuted')
    this.walletUtil = options.walletUtil || new WalletUtil()
  }

  // Resolve the wallet name/WIF passthrough before any request. The missing or
  // double source is reported as a UsageError (exit 2) when it is resolved.
  parseFlags (flags) {
    return parseWalletSourceFlags(flags)
  }

  // Render the reported muted addresses.
  format ({ muted = [] }) {
    return {
      message: formatFollowListMessage(muted, 'muted'),
      data: { muted }
    }
  }

  // Resolve the muter wallet and fetch the addresses it mutes.
  async readMuted ({ name, wif, dbUrl }) {
    const { address } = await resolveWalletSource(
      { name, wif },
      { walletUtil: this.walletUtil }
    )

    return this.createClient(dbUrl).getMuted(address)
  }
}

export default MemoMuted
