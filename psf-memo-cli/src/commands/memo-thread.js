/*
  memo-thread: read a Memo post and its nested reply tree.

  A read-only command. It needs no wallet; the post is identified by its
  transaction id via the required -t flag. The service reply order (oldest
  first) and per-node reply and like counts are preserved. A txid that is not
  an indexed post is reported as a not-found failure so callers can poll.
*/

// Local libraries
import MemoDb from '../lib/memo-db.js'
import { runCommand } from '../lib/reporter.js'
import { bindMethods } from '../lib/bind-methods.js'
import { parseThreadFlags, formatThreadMessage } from '../lib/memo-thread.js'

class MemoThread {
  constructor ({
    MemoDbClass = MemoDb,
    fetchImpl,
    dbUrl,
    envUrl = process.env.MEMO_DB_URL,
    stdout,
    stderr
  } = {}) {
    // Encapsulate dependencies so tests and acceptance can inject a fake
    // service and capture output instead of touching the network or terminal.
    this.MemoDbClass = MemoDbClass
    this.fetchImpl = fetchImpl
    this.dbUrl = dbUrl
    this.envUrl = envUrl
    this.stdout = stdout
    this.stderr = stderr

    bindMethods(this, ['run', 'validateFlags', 'createClient', 'readThread'])
  }

  // Read the thread and report it. Returns the exit code (0/1/2) and assigns it
  // to process.exitCode for commander.
  async run (flags = {}) {
    const code = await runCommand(async () => {
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
    }, { json: flags.json, stdout: this.stdout, stderr: this.stderr })

    process.exitCode = code
    return code
  }

  // Validate and resolve the required -t txid before any request. Throws a
  // UsageError (exit 2) when it is missing.
  validateFlags (flags) {
    return parseThreadFlags(flags)
  }

  // Build the read-only Memo DB client, honoring a --db-url override.
  createClient (dbUrl) {
    return new this.MemoDbClass({
      dbUrl: dbUrl || this.dbUrl,
      envUrl: this.envUrl,
      fetchImpl: this.fetchImpl
    })
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
