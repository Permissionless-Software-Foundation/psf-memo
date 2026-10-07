/*
  memo-topic: read one page of a single topic's posts.

  A read-only command for the psf-memo-db /topics/:room/posts route. The topic
  name comes from the required -r flag; an optional --viewer address scopes the
  page to the viewer's mute filter. It reports the posts (newest first) with the
  shared post-page summary and the service pagination unchanged. A missing -r is
  a usage error (exit 2); a failed request is an error (exit 1). No wallet and no
  broadcast.
*/

// Local libraries
import { initReadCommand, createMemoDbClient, runReadCommand } from '../lib/read-command.js'
import { parseTopicFlags } from '../lib/memo-topic.js'
import { formatFeedMessage } from '../lib/memo-feed.js'

class MemoTopic {
  constructor (options = {}) {
    initReadCommand(this, options, 'readTopicPosts')
  }

  // Read the topic page and report it. Returns the exit code (0/1/2) and assigns
  // it to process.exitCode for commander.
  async run (flags = {}) {
    return runReadCommand({
      command: this,
      flags,
      outcome: async () => {
        const { room, viewer, limit, offset } = this.validateFlags(flags)

        const { posts = [], pagination = {} } = await this.readTopicPosts({
          room,
          viewer,
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

  // Validate and resolve the required room, optional viewer, and page flags
  // before any request. Throws a UsageError (exit 2) when they are invalid.
  validateFlags (flags) {
    return parseTopicFlags(flags)
  }

  // Build the read-only Memo DB client, honoring a --db-url override.
  createClient (dbUrl) {
    return createMemoDbClient(this, dbUrl)
  }

  // Fetch one page of the topic's posts.
  readTopicPosts ({ room, viewer, limit, offset, dbUrl }) {
    return this.createClient(dbUrl).getTopicPosts(room, { limit, offset, viewer })
  }
}

export default MemoTopic

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
