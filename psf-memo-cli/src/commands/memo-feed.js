/*
  memo-feed: read one page of the recent top-level Memo feed.

  A read-only command. It never broadcasts and needs no wallet; an optional
  --viewer address scopes the page to the viewer's mute filter. The service
  pagination is reported unchanged, including the documented capped total.
*/

// Local libraries
import { initReadCommand, createMemoDbClient } from '../lib/read-command.js'
import { parseFeedFlags } from '../lib/memo-feed.js'
import { runPostsPageCommand } from '../lib/post-page-command.js'

class MemoFeed {
  constructor (options = {}) {
    initReadCommand(this, options, 'readFeed')
  }

  // Read the feed page and report it. Returns the exit code (0/1/2) and
  // assigns it to process.exitCode for commander.
  async run (flags = {}) {
    return runPostsPageCommand({ command: this, flags, readMethod: 'readFeed' })
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
// {"version":1,"tested_at":"2026-10-08T14:45:32.202Z","module_hash":"b3c460f06d02bf0e600d75deb339cbfdd23b1493a20471962e676c529c945eae","functions":[{"id":"func/MemoFeed.constructor","name":"MemoFeed.constructor","line":15,"end_line":17,"hash":"9175da551c84d5db0fad233e6eb7a8124993a3dcee2692d80175ae0f3d4a4df3"},{"id":"func/MemoFeed.run","name":"MemoFeed.run","line":21,"end_line":23,"hash":"489a7870c6d2c609019bf945bd8c7ed55b2cc1509907dca0032c1cd2935f479f"},{"id":"func/MemoFeed.validateFlags","name":"MemoFeed.validateFlags","line":28,"end_line":30,"hash":"3ae94d6e68fac6406ba0daab5473f5adf710e7987a3255a95904077bedeb489d"},{"id":"func/MemoFeed.createClient","name":"MemoFeed.createClient","line":33,"end_line":35,"hash":"54385637d7ccdbdb4482a273dbbf40bd7272b92032c0a6f5d6ac2de757b02e80"},{"id":"func/MemoFeed.readFeed","name":"MemoFeed.readFeed","line":38,"end_line":40,"hash":"3135428c6d9b189d8e4003fbcfe58704f4e5b7a11d40f82dd8a9096d187a3bc1"}]}
// mutate4javascript-manifest-end
