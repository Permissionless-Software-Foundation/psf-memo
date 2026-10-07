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
// {"version":1,"tested_at":"2026-10-07T04:01:56.625Z","module_hash":"9078da068259c2dfe832d39b12acbc4804add791f275d12ff126511138976078","functions":[{"id":"func/MemoStatus.constructor","name":"MemoStatus.constructor","line":15,"end_line":17,"hash":"4c0a848e2d6d7eb3086fb32c7da78edaa6d5343e0d19c0498d5572aac6f37cfb"},{"id":"func/MemoStatus.run","name":"MemoStatus.run","line":21,"end_line":38,"hash":"6f28edc8048003a066094850bb5b49a1421c285b86306c3acd404caa9a7508d8"},{"id":"func/MemoStatus.validateFlags","name":"MemoStatus.validateFlags","line":42,"end_line":44,"hash":"9b55458bc5138dd8b9abc4c90c402883faf7547e3f0ea7ebc48b32e1ab9defe0"},{"id":"func/MemoStatus.createClient","name":"MemoStatus.createClient","line":47,"end_line":49,"hash":"54385637d7ccdbdb4482a273dbbf40bd7272b92032c0a6f5d6ac2de757b02e80"},{"id":"func/MemoStatus.readStatus","name":"MemoStatus.readStatus","line":52,"end_line":54,"hash":"e19329a8b2efccad99b46d295128401d93ac127044da1316e0310f2f83e2e558"}]}
// mutate4javascript-manifest-end
