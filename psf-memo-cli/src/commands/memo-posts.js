/*
  memo-posts: read the top-level posts authored by an address.

  A read-only command for the psf-memo-db /posts/by/:addr route. The author
  address comes from the required -a flag; the command reads one page of the
  address's top-level posts (newest first, replies excluded) and reports the
  posts and the service pagination unchanged. A missing -a is a usage error
  (exit 2); a failed request is an error (exit 1). No wallet and no broadcast.
*/

// Local libraries
import { initReadCommand, createMemoDbClient, runReadCommand } from '../lib/read-command.js'
import { parsePostsFlags } from '../lib/memo-posts.js'
import { formatFeedMessage } from '../lib/memo-feed.js'

class MemoPosts {
  constructor (options = {}) {
    initReadCommand(this, options, 'readPosts')
  }

  // Read the address page and report it. Returns the exit code (0/1/2) and
  // assigns it to process.exitCode for commander.
  async run (flags = {}) {
    return runReadCommand({
      command: this,
      flags,
      outcome: async () => {
        const { address, limit, offset } = this.validateFlags(flags)

        const { posts = [], pagination = {} } = await this.readPosts({
          address,
          limit,
          offset,
          dbUrl: flags.dbUrl
        })

        return {
          message: formatFeedMessage(posts, pagination),
          data: { posts, pagination }
        }
      }
    })
  }

  // Validate and resolve the required address and page flags before any
  // request. Throws a UsageError (exit 2) when they are invalid.
  validateFlags (flags) {
    return parsePostsFlags(flags)
  }

  // Build the read-only Memo DB client, honoring a --db-url override.
  createClient (dbUrl) {
    return createMemoDbClient(this, dbUrl)
  }

  // Fetch one page of the address's top-level posts.
  readPosts ({ address, limit, offset, dbUrl }) {
    return this.createClient(dbUrl).getPostsByAddr(address, { limit, offset })
  }
}

export default MemoPosts

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
