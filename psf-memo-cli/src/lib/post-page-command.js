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
