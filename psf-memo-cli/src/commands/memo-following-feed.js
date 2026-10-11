/*
  memo-following-feed: read the viewer's Following feed.

  A wallet-relative, read-only command for the psf-memo-db
  GET /posts/following/:addr route. It resolves the signing wallet (-n <wallet>
  or --wif <wif>) to identify the viewer, then reads one page of the top-level
  posts (replies and the viewer's own posts excluded) authored by the profiles
  the viewer follows, newest first, and reports the posts and the service
  pagination unchanged. This is the CLI mirror of the web client's "Following"
  feed tab; psf-memo-db owns the follow-join, exclusion, and ordering. A missing
  wallet source is a usage error (exit 2); a failed request is an error
  (exit 1). No broadcast.
*/

// Local libraries
import { ListReadCommand } from '../lib/list-command.js'
import { parseFollowingFeedFlags } from '../lib/memo-following-feed.js'
import { formatFeedMessage } from '../lib/memo-feed.js'
import { resolveWalletSource } from '../lib/wallet-source.js'
import WalletUtil from '../lib/wallet-util.js'

const READ_METHOD = 'readFollowingFeed'

class MemoFollowingFeed extends ListReadCommand {
  constructor (options = {}) {
    super(options, READ_METHOD)
    this.walletUtil = options.walletUtil || new WalletUtil()
  }

  // Validate and resolve the page flags before any request. The wallet source
  // presence is validated when it is resolved. Throws a UsageError (exit 2) for
  // a bad --limit or --offset.
  parseFlags (flags = {}) {
    return {
      ...parseFollowingFeedFlags(flags),
      name: flags.name || null,
      wif: flags.wif || null
    }
  }

  // Render the reported posts and the service pagination unchanged.
  format (result) {
    const { posts = [], pagination = {} } = result

    return {
      message: formatFeedMessage(posts, pagination),
      data: { posts, pagination }
    }
  }

  // Resolve the viewer wallet address, then read one page of its Following feed.
  async readFollowingFeed ({ limit, offset, dbUrl, name, wif }) {
    const { address } = await resolveWalletSource(
      { name, wif },
      { walletUtil: this.walletUtil }
    )

    return this.createClient(dbUrl).getFollowingFeed(address, { limit, offset })
  }
}

export default MemoFollowingFeed
