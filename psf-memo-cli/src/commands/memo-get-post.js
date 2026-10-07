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
// {"version":1,"tested_at":"2026-10-07T03:29:30.665Z","module_hash":"3e1096ab92e6d16880433df07a2be5ea0e32d21b247ae1a06df05a01cf2dc374","functions":[{"id":"func/MemoGetPost.constructor","name":"MemoGetPost.constructor","line":17,"end_line":19,"hash":"887282a6f71e456a0223855d51b0a94a3a2691ca8c04bd0de0066300e36961e2"},{"id":"func/MemoGetPost.run","name":"MemoGetPost.run","line":23,"end_line":44,"hash":"17ba1b45810502fad9796b88941fd4b74c65fe997956404efd7d70306c05e657"},{"id":"func/MemoGetPost.validateFlags","name":"MemoGetPost.validateFlags","line":48,"end_line":50,"hash":"0e675eacd8dc14dd5fd375097064f906b9343b939cadac04504248694e977a8f"},{"id":"func/MemoGetPost.createClient","name":"MemoGetPost.createClient","line":53,"end_line":55,"hash":"54385637d7ccdbdb4482a273dbbf40bd7272b92032c0a6f5d6ac2de757b02e80"},{"id":"func/MemoGetPost.readPost","name":"MemoGetPost.readPost","line":58,"end_line":60,"hash":"91b47945dd4bff98697948c13d3bd01a695e442f593ce67ac20f1d4ea40e2ba6"}]}
// mutate4javascript-manifest-end
