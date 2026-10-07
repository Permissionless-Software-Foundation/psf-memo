/*
  memo-thread: read a Memo post and its nested reply tree.

  A read-only command. It needs no wallet; the post is identified by its
  transaction id via the required -t flag. The service reply order (oldest
  first) and per-node reply and like counts are preserved. A txid that is not
  an indexed post is reported as a not-found failure so callers can poll.
*/

// Local libraries
import { initReadCommand, createMemoDbClient, runReadCommand } from '../lib/read-command.js'
import { parseThreadFlags, formatThreadMessage } from '../lib/memo-thread.js'

class MemoThread {
  constructor (options = {}) {
    initReadCommand(this, options, 'readThread')
  }

  // Read the thread and report it. Returns the exit code (0/1/2) and assigns it
  // to process.exitCode for commander.
  async run (flags = {}) {
    return runReadCommand({
      command: this,
      flags,
      outcome: async () => {
        const { txid } = this.validateFlags(flags)
        const thread = await this.readThread({ txid, dbUrl: flags.dbUrl })
        const post = thread?.post

        if (!post) {
          throw new Error(`Post not found: ${txid}`)
        }

        return {
          message: formatThreadMessage(post),
          data: { post }
        }
      }
    })
  }

  // Validate and resolve the required -t txid before any request. Throws a
  // UsageError (exit 2) when it is missing.
  validateFlags (flags) {
    return parseThreadFlags(flags)
  }

  // Build the read-only Memo DB client, honoring a --db-url override.
  createClient (dbUrl) {
    return createMemoDbClient(this, dbUrl)
  }

  // Fetch the post thread from the service. An unindexed txid resolves to null.
  readThread ({ txid, dbUrl }) {
    return this.createClient(dbUrl).getThread(txid)
  }
}

export default MemoThread

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
