/*
  memo-wait: poll until a broadcast Memo post is indexed.

  A read-only command for the psf-memo-db /level/post/:txid store. It queries the
  store immediately, then every --interval milliseconds (default 5000) until the
  post appears or the --timeout budget (default 60000) elapses. When the post is
  stored it reports its fields and exits 0. A timeout is a runtime error (exit
  1); a transport failure aborts without retrying. A non-positive or
  non-integer timing flag is a usage error (exit 2). No wallet and no broadcast.
*/

// Local libraries
import { initReadCommand, createMemoDbClient, runReadCommand } from '../lib/read-command.js'
import { parseWaitFlags, pollForPost } from '../lib/memo-wait.js'
import { formatGetPostMessage } from '../lib/memo-get-post.js'

// The production clock. Both dependencies are injectable so tests never wait on
// real time.
const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

class MemoWait {
  constructor (options = {}) {
    initReadCommand(this, options, 'readPost')
    this.sleep = options.sleep || defaultSleep
    this.now = options.now || Date.now
  }

  // Poll for the post and report it. Returns the exit code (0/1/2) and assigns
  // it to process.exitCode for commander.
  async run (flags = {}) {
    return runReadCommand({
      command: this,
      flags,
      outcome: async () => {
        const { txid, timeout, interval } = this.validateFlags(flags)

        const { post } = await pollForPost({
          read: () => this.readPost({ txid, dbUrl: flags.dbUrl }),
          txid,
          timeout,
          interval,
          sleep: this.sleep,
          now: this.now
        })

        // The stored document is keyed by txid, which is not in the body.
        const reported = { ...post, txid }

        return {
          message: formatGetPostMessage(reported),
          data: { post: reported }
        }
      }
    })
  }

  // Validate and resolve the required -t txid and the wait timing. Throws a
  // UsageError (exit 2) when a flag is missing or invalid.
  validateFlags (flags) {
    return parseWaitFlags(flags)
  }

  // Build the read-only Memo DB client, honoring a --db-url override.
  createClient (dbUrl) {
    return createMemoDbClient(this, dbUrl)
  }

  // Fetch the stored post. A txid with no stored post resolves to null so the
  // poll loop can retry.
  readPost ({ txid, dbUrl }) {
    return this.createClient(dbUrl).getPost(txid)
  }
}

export default MemoWait

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
