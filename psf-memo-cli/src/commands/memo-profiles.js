/*
  memo-profiles: read one page of the recently active profiles list.

  A read-only command for the psf-memo-db GET /profile/recent route. It reports
  the profiles (address, bio text, display name, avatar URL, provenance txid,
  and the most recent qualifying post's block height and seen) in the service's
  order and the service pagination unchanged. Missing display names and avatar
  URLs are reported as null rather than substituted. A failed request is an
  error (exit 1). No wallet and no broadcast.
*/

// Local libraries
import { initReadCommand, createMemoDbClient, runReadCommand } from '../lib/read-command.js'
import { parseProfilesFlags, formatProfilesMessage } from '../lib/memo-profiles.js'

class MemoProfiles {
  constructor (options = {}) {
    initReadCommand(this, options, 'readProfiles')
  }

  // Read the profile page and report it. Returns the exit code (0/1/2) and
  // assigns it to process.exitCode for commander.
  async run (flags = {}) {
    return runReadCommand({
      command: this,
      flags,
      outcome: async () => {
        const { limit, offset } = this.validateFlags(flags)

        const { profiles = [], pagination = {} } = await this.readProfiles({
          limit,
          offset,
          dbUrl: flags.dbUrl
        })

        return {
          message: formatProfilesMessage(profiles, pagination),
          data: { profiles, pagination }
        }
      }
    })
  }

  // Validate and resolve the page flags before any request. Throws a UsageError
  // (exit 2) for a bad --limit or --offset.
  validateFlags (flags) {
    return parseProfilesFlags(flags)
  }

  // Build the read-only Memo DB client, honoring a --db-url override.
  createClient (dbUrl) {
    return createMemoDbClient(this, dbUrl)
  }

  // Fetch one page of the recent-profiles list.
  readProfiles ({ limit, offset, dbUrl }) {
    return this.createClient(dbUrl).getRecentProfiles({ limit, offset })
  }
}

export default MemoProfiles
