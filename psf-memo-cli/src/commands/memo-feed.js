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
// {"version":1,"tested_at":"2026-10-07T02:27:09.382Z","module_hash":"8a98f0e74849aa4f3978cd4ba95d710fbefa8152f75d26f24d90d44bc68098fa","functions":[{"id":"func/MemoFeed.constructor","name":"MemoFeed.constructor","line":14,"end_line":16,"hash":"9175da551c84d5db0fad233e6eb7a8124993a3dcee2692d80175ae0f3d4a4df3"},{"id":"func/MemoFeed.run","name":"MemoFeed.run","line":20,"end_line":39,"hash":"63b2a58dcbae3b67fc946f3d4938db43939886ae00d7be227951c2dd2fbc7539"},{"id":"func/MemoFeed.validateFlags","name":"MemoFeed.validateFlags","line":44,"end_line":46,"hash":"3ae94d6e68fac6406ba0daab5473f5adf710e7987a3255a95904077bedeb489d"},{"id":"func/MemoFeed.createClient","name":"MemoFeed.createClient","line":49,"end_line":51,"hash":"54385637d7ccdbdb4482a273dbbf40bd7272b92032c0a6f5d6ac2de757b02e80"},{"id":"func/MemoFeed.readFeed","name":"MemoFeed.readFeed","line":54,"end_line":56,"hash":"3135428c6d9b189d8e4003fbcfe58704f4e5b7a11d40f82dd8a9096d187a3bc1"}]}
// mutate4javascript-manifest-end
