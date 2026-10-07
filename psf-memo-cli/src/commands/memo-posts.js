/*
  memo-posts: read the top-level posts authored by an address.

  A read-only command for the psf-memo-db /posts/by/:addr route. The author
  address comes from the required -a flag; the command reads one page of the
  address's top-level posts (newest first, replies excluded) and reports the
  posts and the service pagination unchanged. A missing -a is a usage error
  (exit 2); a failed request is an error (exit 1). No wallet and no broadcast.
*/

// Local libraries
import { initReadCommand, createMemoDbClient } from '../lib/read-command.js'
import { parsePostsFlags } from '../lib/memo-posts.js'
import { runPostsPageCommand } from '../lib/post-page-command.js'

class MemoPosts {
  constructor (options = {}) {
    initReadCommand(this, options, 'readPosts')
  }

  // Read the address page and report it. Returns the exit code (0/1/2) and
  // assigns it to process.exitCode for commander.
  async run (flags = {}) {
    return runPostsPageCommand({ command: this, flags, readMethod: 'readPosts' })
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
// {"version":1,"tested_at":"2026-10-07T20:43:25.212Z","module_hash":"bf58b409f8fb1a1db5be88faf7fc835ead27dd10c8d4bf2796ce84c9e96748cc","functions":[{"id":"func/MemoPosts.constructor","name":"MemoPosts.constructor","line":17,"end_line":19,"hash":"73d9b6f3d73430020863c73ceb1d6aa0f607bb03ba191104bd7eee68424e8e1d"},{"id":"func/MemoPosts.run","name":"MemoPosts.run","line":23,"end_line":25,"hash":"b0b34cefac94edc92195986070faf818546055b6fff29b36223f366e9318b069"},{"id":"func/MemoPosts.validateFlags","name":"MemoPosts.validateFlags","line":29,"end_line":31,"hash":"02370be167f154a8eeaad8bfcb912a90580b395b66d236943bce50003e730788"},{"id":"func/MemoPosts.createClient","name":"MemoPosts.createClient","line":34,"end_line":36,"hash":"54385637d7ccdbdb4482a273dbbf40bd7272b92032c0a6f5d6ac2de757b02e80"},{"id":"func/MemoPosts.readPosts","name":"MemoPosts.readPosts","line":39,"end_line":41,"hash":"652d4ccec2df98ce4a6ac6a377373afafb749d0409c20002a458c9227a697f23"}]}
// mutate4javascript-manifest-end
