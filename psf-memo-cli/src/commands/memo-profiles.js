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
import { ListReadCommand } from '../lib/list-command.js'
import { parseProfilesFlags, formatProfilesMessage } from '../lib/memo-profiles.js'

class MemoProfiles extends ListReadCommand {
  constructor (options = {}) {
    super(options, 'readProfiles')
  }

  // Validate and resolve the page flags before any request. Throws a UsageError
  // (exit 2) for a bad --limit or --offset.
  parseFlags (flags) {
    return parseProfilesFlags(flags)
  }

  // Render the reported profiles and the service pagination.
  format ({ profiles = [], pagination = {} }) {
    return {
      message: formatProfilesMessage(profiles, pagination),
      data: { profiles, pagination }
    }
  }

  // Fetch one page of the recent-profiles list.
  readProfiles ({ limit, offset, dbUrl }) {
    return this.createClient(dbUrl).getRecentProfiles({ limit, offset })
  }
}

export default MemoProfiles
