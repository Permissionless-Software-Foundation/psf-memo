/*
  memo-feed: read one page of the recent top-level Memo feed.

  A read-only command. It never broadcasts and needs no wallet; an optional
  --viewer address scopes the page to the viewer's mute filter. The service
  pagination is reported unchanged, including the documented capped total.
*/

// Local libraries
import MemoDb from '../lib/memo-db.js'
import { runCommand } from '../lib/reporter.js'
import { bindMethods } from '../lib/bind-methods.js'
import { parseFeedFlags, formatFeedMessage } from '../lib/memo-feed.js'

class MemoFeed {
  constructor ({
    MemoDbClass = MemoDb,
    fetchImpl,
    dbUrl,
    envUrl = process.env.MEMO_DB_URL,
    stdout,
    stderr
  } = {}) {
    // Encapsulate dependencies so tests and acceptance can inject a fake
    // service and capture output instead of touching the network or terminal.
    this.MemoDbClass = MemoDbClass
    this.fetchImpl = fetchImpl
    this.dbUrl = dbUrl
    this.envUrl = envUrl
    this.stdout = stdout
    this.stderr = stderr

    bindMethods(this, ['run', 'validateFlags', 'createClient', 'readFeed'])
  }

  // Read the feed page and report it. Returns the exit code (0/1/2) and
  // assigns it to process.exitCode for commander.
  async run (flags = {}) {
    const code = await runCommand(async () => {
      this.validateFlags(flags)

      const { limit, offset, viewer } = parseFeedFlags(flags)
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
    }, { json: flags.json, stdout: this.stdout, stderr: this.stderr })

    process.exitCode = code
    return code
  }

  // Validate the page flags before any request. Throws a UsageError (exit 2).
  validateFlags (flags) {
    parseFeedFlags(flags)
    return true
  }

  // Build the read-only Memo DB client, honoring a --db-url override.
  createClient (dbUrl) {
    return new this.MemoDbClass({
      dbUrl: dbUrl || this.dbUrl,
      envUrl: this.envUrl,
      fetchImpl: this.fetchImpl
    })
  }

  // Fetch one recent-feed page from the service.
  readFeed ({ limit, offset, viewer, dbUrl }) {
    return this.createClient(dbUrl).getRecentPosts({ limit, offset, viewer })
  }
}

export default MemoFeed

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
