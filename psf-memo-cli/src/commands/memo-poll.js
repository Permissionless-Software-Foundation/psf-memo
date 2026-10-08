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
