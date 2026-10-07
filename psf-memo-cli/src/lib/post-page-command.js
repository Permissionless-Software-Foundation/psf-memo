/*
  Shared scaffolding for read commands that report a page of posts.

  The command supplies its flag parser and its read method; this module owns the
  validate -> read -> { posts, pagination } pipeline and the shared post-page
  summary, mirroring read-command.js for the generic read path.
*/

// Local libraries
import { runReadCommand } from './read-command.js'
import { formatFeedMessage } from './memo-feed.js'

// Validate the flags, read the page through `command[readMethod]`, and report
// the posts and pagination. `readMethod` receives the parsed flags plus the
// --db-url override, so each command keeps its own read signature.
export async function runPostsPageCommand ({ command, flags, readMethod }) {
  return runReadCommand({
    command,
    flags,
    outcome: async () => {
      const fields = command.validateFlags(flags)
      const { posts = [], pagination = {} } = await command[readMethod]({
        ...fields,
        dbUrl: flags.dbUrl
      })

      return {
        message: formatFeedMessage(posts, pagination),
        data: { posts, pagination }
      }
    }
  })
}

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
