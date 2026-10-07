/*
  memo-get-post: read a single stored Memo post document.

  A read-only command for the psf-memo-db /level/post/:txid store. The post is
  identified by its transaction id via the required -t flag. The stored text,
  author address, block height, and seen timestamp are reported alongside the
  request txid. A txid with no stored post is a not-found failure (exit 1) so
  callers can poll. No wallet and no broadcast.
*/

// Local libraries
import { initReadCommand, createMemoDbClient, runReadCommand } from '../lib/read-command.js'
import { parseTxidFlag } from '../lib/txid-flag.js'
import { formatGetPostMessage } from '../lib/memo-get-post.js'

class MemoGetPost {
  constructor (options = {}) {
    initReadCommand(this, options, 'readPost')
  }

  // Read the stored post and report it. Returns the exit code (0/1/2) and
  // assigns it to process.exitCode for commander.
  async run (flags = {}) {
    return runReadCommand({
      command: this,
      flags,
      outcome: async () => {
        const { txid } = this.validateFlags(flags)
        const post = await this.readPost({ txid, dbUrl: flags.dbUrl })

        if (!post) {
          throw new Error(`Post not found: ${txid}`)
        }

        // The stored document is keyed by txid, which is not in the body.
        const reported = { ...post, txid }

        return {
          message: formatGetPostMessage(reported),
          data: { post: reported }
        }
      }
    })
  }

  // Validate and resolve the required -t txid before any request. Throws a
  // UsageError (exit 2) when it is missing.
  validateFlags (flags) {
    return parseTxidFlag(flags)
  }

  // Build the read-only Memo DB client, honoring a --db-url override.
  createClient (dbUrl) {
    return createMemoDbClient(this, dbUrl)
  }

  // Fetch the stored post. A txid with no stored post resolves to null.
  readPost ({ txid, dbUrl }) {
    return this.createClient(dbUrl).getPost(txid)
  }
}

export default MemoGetPost

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
