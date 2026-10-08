/*
  memo-poll: read a single Memo poll with its options and votes.

  A read-only command for the psf-memo-db GET /polls/:txid route. The poll is
  identified by its transaction id via the required -t flag. It reports the
  poll's question, its options (each option's text and author address), and its
  current votes (each vote's comment and voter address). A txid with no poll is
  a not-found failure (exit 1). No wallet and no broadcast.
*/

// Local libraries
import { initReadCommand, createMemoDbClient, runReadCommand } from '../lib/read-command.js'
import { parseTxidFlag } from '../lib/txid-flag.js'
import { formatPollMessage } from '../lib/memo-poll.js'

class MemoPoll {
  constructor (options = {}) {
    initReadCommand(this, options, 'readPoll')
  }

  // Read the poll and report it. Returns the exit code (0/1/2) and assigns it
  // to process.exitCode for commander.
  async run (flags = {}) {
    return runReadCommand({
      command: this,
      flags,
      outcome: async () => {
        const { txid } = this.validateFlags(flags)
        const poll = await this.readPoll({ txid, dbUrl: flags.dbUrl })

        if (!poll) {
          throw new Error(`Poll not found: ${txid}`)
        }

        return {
          message: formatPollMessage(poll),
          data: { poll }
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

  // Fetch the poll. A txid with no poll resolves to null.
  readPoll ({ txid, dbUrl }) {
    return this.createClient(dbUrl).getPoll(txid)
  }
}

export default MemoPoll

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T01:41:05.085Z","module_hash":"8c388851b3f85dc7b60d4bf656de72a4c879bc0f5c60827f28b0d2808a24fcbc","functions":[{"id":"func/MemoPoll.constructor","name":"MemoPoll.constructor","line":17,"end_line":19,"hash":"fb190b9b38c9d58191442add9b3e7f96fde0457148b0a85bceeb61527e834b9e"},{"id":"func/MemoPoll.run","name":"MemoPoll.run","line":23,"end_line":41,"hash":"1af33f4f01bcfc3cc377b340468239eec87c14e712ca3d22392f88c1c3ccf214"},{"id":"func/MemoPoll.validateFlags","name":"MemoPoll.validateFlags","line":45,"end_line":47,"hash":"0e675eacd8dc14dd5fd375097064f906b9343b939cadac04504248694e977a8f"},{"id":"func/MemoPoll.createClient","name":"MemoPoll.createClient","line":50,"end_line":52,"hash":"54385637d7ccdbdb4482a273dbbf40bd7272b92032c0a6f5d6ac2de757b02e80"},{"id":"func/MemoPoll.readPoll","name":"MemoPoll.readPoll","line":55,"end_line":57,"hash":"e57ea8efb0cf1c26248c8ffeacfc58b9a369a9735d81981abd66f4d4e7144e40"}]}
// mutate4javascript-manifest-end
