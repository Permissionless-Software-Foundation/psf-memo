/*
  memo-following: read the addresses a wallet follows.

  A read-only command for the psf-memo-db GET /follow/following/:addr route. It
  resolves the signing wallet (-n <wallet> or --wif <wif>) to the follower
  address and reports the returned followee cash addresses. The list is
  unpaginated. A missing wallet source is a usage error (exit 2); a failed
  request is an error (exit 1). No broadcast.
*/

// Local libraries
import { ListReadCommand } from '../lib/list-command.js'
import { parseFollowingFlags, formatFollowListMessage } from '../lib/follow-list.js'
import { resolveWalletSource } from '../lib/wallet-source.js'
import WalletUtil from '../lib/wallet-util.js'

class MemoFollowing extends ListReadCommand {
  constructor (options = {}) {
    super(options, 'readFollowing')
    this.walletUtil = options.walletUtil || new WalletUtil()
  }

  // Resolve the wallet name/WIF passthrough before any request. The missing or
  // double source is reported as a UsageError (exit 2) when it is resolved.
  parseFlags (flags) {
    return parseFollowingFlags(flags)
  }

  // Render the reported following addresses.
  format ({ following = [] }) {
    return {
      message: formatFollowListMessage(following, 'following'),
      data: { following }
    }
  }

  // Resolve the follower wallet and fetch the addresses it follows.
  async readFollowing ({ name, wif, dbUrl }) {
    const { address } = await resolveWalletSource(
      { name, wif },
      { walletUtil: this.walletUtil }
    )

    return this.createClient(dbUrl).getFollowing(address)
  }
}

export default MemoFollowing
