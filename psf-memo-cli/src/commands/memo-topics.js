/*
  memo-topics: read one page of the Memo topic list.

  A read-only command for the psf-memo-db GET /topics route. It reports the
  topics (room, post count, last-post time as lastSeen, and follower count) in
  the service's order and the service pagination unchanged. A failed request is
  an error (exit 1). No wallet and no broadcast.
*/

// Local libraries
import { ListReadCommand } from '../lib/list-command.js'
import { parseTopicsFlags, formatTopicsMessage } from '../lib/memo-topics.js'

class MemoTopics extends ListReadCommand {
  constructor (options = {}) {
    super(options, 'readTopics')
  }

  // Validate and resolve the page flags before any request. Throws a UsageError
  // (exit 2) for a bad --limit or --offset.
  parseFlags (flags) {
    return parseTopicsFlags(flags)
  }

  // Render the reported topics and the service pagination.
  format ({ topics = [], pagination = {} }) {
    return {
      message: formatTopicsMessage(topics, pagination),
      data: { topics, pagination }
    }
  }

  // Fetch one page of the topic list.
  readTopics ({ limit, offset, dbUrl }) {
    return this.createClient(dbUrl).getTopics({ limit, offset })
  }
}

export default MemoTopics

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-07T20:54:43.327Z","module_hash":"7bfbfc72240364877835bb20855fb82e5825e932a9df6d34ef596c2ce5e427f7","functions":[{"id":"func/MemoTopics.constructor","name":"MemoTopics.constructor","line":15,"end_line":17,"hash":"4b551d8900a25e5b375a1b6f0834ae726f41ff5f61082977804a7fde420965b5"},{"id":"func/MemoTopics.run","name":"MemoTopics.run","line":21,"end_line":40,"hash":"6666ed87fedd6f01672335cceb36cc744589bc45071f08d0d05bf197e61048ec"},{"id":"func/MemoTopics.validateFlags","name":"MemoTopics.validateFlags","line":44,"end_line":46,"hash":"e22d9d2566c26ce7d20fe1ce81537dbd81653210812fd27d1dbac48bd4952085"},{"id":"func/MemoTopics.createClient","name":"MemoTopics.createClient","line":49,"end_line":51,"hash":"54385637d7ccdbdb4482a273dbbf40bd7272b92032c0a6f5d6ac2de757b02e80"},{"id":"func/MemoTopics.readTopics","name":"MemoTopics.readTopics","line":54,"end_line":56,"hash":"0a102029eb7908dfeb38a0b3339a822a6300cd75db82c324b2d30bc1232456a3"}]}
// mutate4javascript-manifest-end
