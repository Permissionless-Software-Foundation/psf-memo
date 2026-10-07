/*
  memo-status: report the psf-memo-db indexer's sync state.

  A read-only command for GET /level/status/status. It reports the first indexed
  block (startBlockHeight), the last fully indexed block (syncedBlockHeight),
  and the chain tip at the last sync (chainBlockHeight), so an agent can tell
  whether a broadcast can be visible yet. No wallet and no broadcast.
*/

// Local libraries
import { initReadCommand, createMemoDbClient, runReadCommand } from '../lib/read-command.js'
import { formatStatusMessage } from '../lib/memo-status.js'

class MemoStatus {
  constructor (options = {}) {
    initReadCommand(this, options, 'readStatus')
  }

  // Read the indexer status and report it. Returns the exit code (0/1/2) and
  // assigns it to process.exitCode for commander.
  async run (flags = {}) {
    return runReadCommand({
      command: this,
      flags,
      outcome: async () => {
        const status = await this.readStatus({ dbUrl: flags.dbUrl })

        if (!status) {
          throw new Error('Indexer status not found.')
        }

        return {
          message: formatStatusMessage(status),
          data: { status }
        }
      }
    })
  }

  // memo-status takes no required flags; present for the shared read-command
  // interface.
  validateFlags () {
    return true
  }

  // Build the read-only Memo DB client, honoring a --db-url override.
  createClient (dbUrl) {
    return createMemoDbClient(this, dbUrl)
  }

  // Fetch the indexer status. A missing status record resolves to null.
  readStatus ({ dbUrl } = {}) {
    return this.createClient(dbUrl).getStatus()
  }
}

export default MemoStatus

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
