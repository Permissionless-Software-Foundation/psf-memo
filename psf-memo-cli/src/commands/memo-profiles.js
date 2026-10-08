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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T00:46:05.902Z","module_hash":"5de02c55479073cced693bf053d332e3765b301f4c1b678ab2cf08a6d83e8e97","functions":[{"id":"func/MemoProfiles.constructor","name":"MemoProfiles.constructor","line":17,"end_line":19,"hash":"5c7b4fc7e503ae2081d5af749eab3aed93d5cfa9314607c478cc0493aee7f7c3"},{"id":"func/MemoProfiles.parseFlags","name":"MemoProfiles.parseFlags","line":23,"end_line":25,"hash":"e40f6d86428a721af387d4a5af2f7b7ea2de7a45a7965a7e16fced715614d624"},{"id":"func/MemoProfiles.format","name":"MemoProfiles.format","line":28,"end_line":33,"hash":"51df50dd528e2fa8005b85de6c92e0f078242343bbe6bba590a6947670895e02"},{"id":"func/MemoProfiles.readProfiles","name":"MemoProfiles.readProfiles","line":36,"end_line":38,"hash":"20439094b49c7b7067fcb66a49a3169ae4d711b58eacee13d0d9dbdca12a55a0"}]}
// mutate4javascript-manifest-end
