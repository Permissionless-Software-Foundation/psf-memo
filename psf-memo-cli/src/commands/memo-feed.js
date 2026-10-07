/*
  memo-feed: read one page of the recent top-level Memo feed.

  A read-only command. It never broadcasts and needs no wallet; an optional
  --viewer address scopes the page to the viewer's mute filter. The service
  pagination is reported unchanged, including the documented capped total.
*/

// Local libraries
import { initReadCommand, createMemoDbClient, runReadCommand } from '../lib/read-command.js'
import { parseFeedFlags, formatFeedMessage } from '../lib/memo-feed.js'

class MemoFeed {
  constructor (options = {}) {
    initReadCommand(this, options, 'readFeed')
  }

  // Read the feed page and report it. Returns the exit code (0/1/2) and
  // assigns it to process.exitCode for commander.
  async run (flags = {}) {
    return runReadCommand({
      command: this,
      flags,
      outcome: async () => {
        const { limit, offset, viewer } = this.validateFlags(flags)
        const { posts = [], pagination = {} } = await this.readFeed({
          limit,
          offset,
          viewer,
          dbUrl: flags.dbUrl
        })

        return {
          message: formatFeedMessage(posts, pagination),
          data: { posts, pagination }
        }
      }
    })
  }

  // Validate and resolve the page flags before any request. Throws a
  // UsageError (exit 2) for a bad --limit or --offset; otherwise returns the
  // resolved page so the command parses the flags exactly once.
  validateFlags (flags) {
    return parseFeedFlags(flags)
  }

  // Build the read-only Memo DB client, honoring a --db-url override.
  createClient (dbUrl) {
    return createMemoDbClient(this, dbUrl)
  }

  // Fetch one recent-feed page from the service.
  readFeed ({ limit, offset, viewer, dbUrl }) {
    return this.createClient(dbUrl).getRecentPosts({ limit, offset, viewer })
  }
}

export default MemoFeed

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-07T01:57:58.673Z","module_hash":"8e0fe7bca2452211a1b7aef0f2fab2db3129a70fd9c342178951612faf9bdf36","functions":[{"id":"func/MemoFeed.constructor","name":"MemoFeed.constructor","line":16,"end_line":34,"hash":"681493cec7d43c22fdd2f44cd7adb33de18f6447be1e359cc1c7fd27f67727ae"},{"id":"func/MemoFeed.run","name":"MemoFeed.run","line":38,"end_line":56,"hash":"fc2e7d0bfebe7b28b017da2d56f60d60b35741f116816eb3c6d20039697d558c"},{"id":"func/MemoFeed.validateFlags","name":"MemoFeed.validateFlags","line":61,"end_line":63,"hash":"3ae94d6e68fac6406ba0daab5473f5adf710e7987a3255a95904077bedeb489d"},{"id":"func/MemoFeed.createClient","name":"MemoFeed.createClient","line":66,"end_line":72,"hash":"5505a5e7d84ec18e62ed5f01543c4d8056bf8b6d479faa8591e15930e197453f"},{"id":"func/MemoFeed.readFeed","name":"MemoFeed.readFeed","line":75,"end_line":77,"hash":"3135428c6d9b189d8e4003fbcfe58704f4e5b7a11d40f82dd8a9096d187a3bc1"}]}
// mutate4javascript-manifest-end
