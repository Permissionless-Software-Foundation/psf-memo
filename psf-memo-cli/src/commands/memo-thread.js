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
// {"version":1,"tested_at":"2026-10-07T02:26:58.975Z","module_hash":"c03c6cb370bba2a7065b267f73aba5cdc9ddb33b23aa62c82be1287ef64d3e3f","functions":[{"id":"func/MemoThread.constructor","name":"MemoThread.constructor","line":15,"end_line":17,"hash":"c6fc6172e69bcb6cc9fbf66f829e5d589843f222d182a82b558a49762d1532ba"},{"id":"func/MemoThread.run","name":"MemoThread.run","line":21,"end_line":40,"hash":"ad4afb69af49a94ac62b09a4b38d44246955f356a07298261862059ef2069364"},{"id":"func/MemoThread.validateFlags","name":"MemoThread.validateFlags","line":44,"end_line":46,"hash":"4d8f53ce3cc4fdeb65042487013af9d9a372ccc02f094c265a5872a77e9b3bcf"},{"id":"func/MemoThread.createClient","name":"MemoThread.createClient","line":49,"end_line":51,"hash":"54385637d7ccdbdb4482a273dbbf40bd7272b92032c0a6f5d6ac2de757b02e80"},{"id":"func/MemoThread.readThread","name":"MemoThread.readThread","line":54,"end_line":56,"hash":"3e2c3bc03c835efe1059a39a9cd49df4629f04e534339817788ef6e3329aff12"}]}
// mutate4javascript-manifest-end
