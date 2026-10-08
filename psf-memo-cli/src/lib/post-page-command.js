/*
  Shared scaffolding for read commands that report a page of posts.

  The command supplies its flag parser and its read method; this module owns the
  shared post-page summary and delegates the validate -> read -> report pipeline
  to runOutcomeCommand, mirroring read-command.js for the generic read path.
*/

// Local libraries
import { runOutcomeCommand } from './read-command.js'
import { formatFeedMessage } from './memo-feed.js'

// Validate the flags, read the page through `command[readMethod]`, and report
// the posts and pagination. `readMethod` receives the parsed flags plus the
// --db-url override, so each command keeps its own read signature.
export async function runPostsPageCommand ({ command, flags, readMethod }) {
  return runOutcomeCommand({
    command,
    flags,
    readMethod,
    format: ({ posts = [], pagination = {} }) => ({
      message: formatFeedMessage(posts, pagination),
      data: { posts, pagination }
    })
  })
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:57:41.557Z","module_hash":"075efc1ee1b49c591f8c1b127e234c6465b70d2613c8f584cf286795ca6e1e6b","functions":[{"id":"func/runPostsPageCommand","name":"runPostsPageCommand","line":16,"end_line":26,"hash":"f60a55cf3d90144b220a69429c398c8b866550a9fa223b635240d35f148ea968"}]}
// mutate4javascript-manifest-end
