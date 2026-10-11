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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T18:20:45.342Z","module_hash":"508f553a46777e01f4cb505bbe1ec3bbd4f6f09fcb95be0ad777ce6503aa2c07","functions":[{"id":"func/MemoFollowingFeed.constructor","name":"MemoFollowingFeed.constructor","line":25,"end_line":28,"hash":"06903c0f95c9889a213f231f404c8bd9999dceb7edc60b4fee6a30b85bc35953"},{"id":"func/MemoFollowingFeed.parseFlags","name":"MemoFollowingFeed.parseFlags","line":33,"end_line":39,"hash":"72a845abd9c39747a194aa68141149802b8eb9958df768fccd271c0a3c9c0c29"},{"id":"func/MemoFollowingFeed.format","name":"MemoFollowingFeed.format","line":42,"end_line":49,"hash":"7d766f676815a6f948edad3bb7c2cdaa1ef5f76e203dd36ef32dc72b81465e75"},{"id":"func/MemoFollowingFeed.readFollowingFeed","name":"MemoFollowingFeed.readFollowingFeed","line":52,"end_line":59,"hash":"4fc4661a841d2937743a8176a57ac0ee7ab5781e8a90c7f438de5f38da9ef930"}]}
// mutate4javascript-manifest-end
