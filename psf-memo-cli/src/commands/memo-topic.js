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
import { initReadCommand, createMemoDbClient } from '../lib/read-command.js'
import { parseTopicFlags } from '../lib/memo-topic.js'
import { runPostsPageCommand } from '../lib/post-page-command.js'

class MemoTopic {
  constructor (options = {}) {
    initReadCommand(this, options, 'readTopicPosts')
  }

  // Read the topic page and report it. Returns the exit code (0/1/2) and assigns
  // it to process.exitCode for commander.
  async run (flags = {}) {
    return runPostsPageCommand({ command: this, flags, readMethod: 'readTopicPosts' })
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
// {"version":1,"tested_at":"2026-10-07T23:38:38.707Z","module_hash":"96036689356556551ddd3f5ebb749a168bcaab355a3af22a71c60a0fd38fa2f3","functions":[{"id":"func/MemoTopic.constructor","name":"MemoTopic.constructor","line":18,"end_line":20,"hash":"8a678bdd067c0391e9a58feb6049a942d29664a00707b28a40e99428b944088b"},{"id":"func/MemoTopic.run","name":"MemoTopic.run","line":24,"end_line":26,"hash":"9827a3a34d946d87b30947e936f0da3450edcdac865c7ce7814805acb986b1fa"},{"id":"func/MemoTopic.validateFlags","name":"MemoTopic.validateFlags","line":30,"end_line":32,"hash":"623ea26a5e69827a1e14c79369bd7c425aabedfd7a64f2c22066a015646068ef"},{"id":"func/MemoTopic.createClient","name":"MemoTopic.createClient","line":35,"end_line":37,"hash":"54385637d7ccdbdb4482a273dbbf40bd7272b92032c0a6f5d6ac2de757b02e80"},{"id":"func/MemoTopic.readTopicPosts","name":"MemoTopic.readTopicPosts","line":40,"end_line":42,"hash":"228d0ea2bd2ffaaf9e443d9cd4a30e7d53ecc3583bebdfe266f4b49691687de6"}]}
// mutate4javascript-manifest-end
