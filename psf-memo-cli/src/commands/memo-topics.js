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
// {"version":1,"tested_at":"2026-10-08T00:47:39.428Z","module_hash":"ef898f757e22fae920dca08e246ef57258a7d7fe5afa2eedf3394d875393b1a1","functions":[{"id":"func/MemoTopics.constructor","name":"MemoTopics.constructor","line":15,"end_line":17,"hash":"d9ef68df8a93af83dc24374c2ad57123d307dd9c4db7c40c652f8acfbc920f58"},{"id":"func/MemoTopics.parseFlags","name":"MemoTopics.parseFlags","line":21,"end_line":23,"hash":"569d719b74aa9b64bb003f607e5b09897319d92e4c146c98ecb94481e17ecd4e"},{"id":"func/MemoTopics.format","name":"MemoTopics.format","line":26,"end_line":31,"hash":"42ce6e3a0e525e1a70ae119a7de3b1b5ccb2af0bc3b14a55b3ecfdbaad89ab88"},{"id":"func/MemoTopics.readTopics","name":"MemoTopics.readTopics","line":34,"end_line":36,"hash":"0a102029eb7908dfeb38a0b3339a822a6300cd75db82c324b2d30bc1232456a3"}]}
// mutate4javascript-manifest-end
