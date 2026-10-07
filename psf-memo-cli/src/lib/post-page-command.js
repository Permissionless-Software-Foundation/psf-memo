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
// {"version":1,"tested_at":"2026-10-07T20:43:14.591Z","module_hash":"3d0e61ffe0c5956aac6668e422010b485eaf22d98dceeaa08b55e3f040d593dc","functions":[{"id":"func/runPostsPageCommand","name":"runPostsPageCommand","line":16,"end_line":33,"hash":"6197e55ff99ee0196314bdbddab0a6021c5b91a4de40c11dcb5ca2bb9afed589"}]}
// mutate4javascript-manifest-end
