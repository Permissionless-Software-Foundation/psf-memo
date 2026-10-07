/*
  memo-topics: read one page of the Memo topic list.

  A read-only command for the psf-memo-db GET /topics route. It reports the
  topics (room, post count, last-post time as lastSeen, and follower count) in
  the service's order and the service pagination unchanged. A failed request is
  an error (exit 1). No wallet and no broadcast.
*/

// Local libraries
import { initReadCommand, createMemoDbClient, runReadCommand } from '../lib/read-command.js'
import { parseTopicsFlags, formatTopicsMessage } from '../lib/memo-topics.js'

class MemoTopics {
  constructor (options = {}) {
    initReadCommand(this, options, 'readTopics')
  }

  // Read the topic page and report it. Returns the exit code (0/1/2) and
  // assigns it to process.exitCode for commander.
  async run (flags = {}) {
    return runReadCommand({
      command: this,
      flags,
      outcome: async () => {
        const { limit, offset } = this.validateFlags(flags)

        const { topics = [], pagination = {} } = await this.readTopics({
          limit,
          offset,
          dbUrl: flags.dbUrl
        })

        return {
          message: formatTopicsMessage(topics, pagination),
          data: { topics, pagination }
        }
      }
    })
  }

  // Validate and resolve the page flags before any request. Throws a UsageError
  // (exit 2) for a bad --limit or --offset.
  validateFlags (flags) {
    return parseTopicsFlags(flags)
  }

  // Build the read-only Memo DB client, honoring a --db-url override.
  createClient (dbUrl) {
    return createMemoDbClient(this, dbUrl)
  }

  // Fetch one page of the topic list.
  readTopics ({ limit, offset, dbUrl }) {
    return this.createClient(dbUrl).getTopics({ limit, offset })
  }
}

export default MemoTopics

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
