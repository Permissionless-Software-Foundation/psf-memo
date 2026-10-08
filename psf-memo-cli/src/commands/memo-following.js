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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T01:13:45.489Z","module_hash":"90a0ae5c7a4cebb0c3a55c9bddce5b12d09d943da3ee3c674ff3ec67cf973101","functions":[{"id":"func/MemoFollowing.constructor","name":"MemoFollowing.constructor","line":18,"end_line":21,"hash":"f15918f3237de263f4dce645d652833c73584a647031741e087eec60de5404a6"},{"id":"func/MemoFollowing.parseFlags","name":"MemoFollowing.parseFlags","line":25,"end_line":27,"hash":"9947dd59d897d3c526c2fcf851e83946f24e654d4d185e7278d01dc52fd49e86"},{"id":"func/MemoFollowing.format","name":"MemoFollowing.format","line":30,"end_line":35,"hash":"b5d93e92d309264fda83eda5b9436a7821b7fd9585c9405acc611deab085be47"},{"id":"func/MemoFollowing.readFollowing","name":"MemoFollowing.readFollowing","line":38,"end_line":45,"hash":"151926fd5bded1bcea49e417380e4723922722ff9e1a394af3e50b89b49271b5"}]}
// mutate4javascript-manifest-end
