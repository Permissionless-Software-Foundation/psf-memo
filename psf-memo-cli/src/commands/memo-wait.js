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
// {"version":1,"tested_at":"2026-10-08T14:46:58.638Z","module_hash":"0cc795c9ee17b62e649f760e8be162dd290feb393c7e5ed91e0fc96ade4c6b29","functions":[{"id":"func/defaultSleep","name":"defaultSleep","line":19,"end_line":19,"hash":"9d0cadca5c385e89ac481f016f9e0ff5c0fd65659a9db3bce522d4f8b61bed98"},{"id":"func/MemoWait.constructor","name":"MemoWait.constructor","line":22,"end_line":26,"hash":"146bdf8a3de6418f49bdc06ead10c29a00c5fb80d48692d8f8784c641079205b"},{"id":"func/MemoWait.run","name":"MemoWait.run","line":30,"end_line":55,"hash":"0eefb3e80f98e87e238081ffcc14299251985c2e2536753e6fb9680c2f8f90c8"},{"id":"func/MemoWait.validateFlags","name":"MemoWait.validateFlags","line":59,"end_line":61,"hash":"dc1b7381cf92909a6be03b54f0761fdc556ba694ff38dbde840b1f59c3aec03e"},{"id":"func/MemoWait.createClient","name":"MemoWait.createClient","line":64,"end_line":66,"hash":"54385637d7ccdbdb4482a273dbbf40bd7272b92032c0a6f5d6ac2de757b02e80"},{"id":"func/MemoWait.readPost","name":"MemoWait.readPost","line":70,"end_line":72,"hash":"91b47945dd4bff98697948c13d3bd01a695e442f593ce67ac20f1d4ea40e2ba6"}]}
// mutate4javascript-manifest-end
