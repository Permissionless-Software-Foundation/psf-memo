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
import { defineListReadCommand } from '../lib/list-command.js'
import { parseProfilesFlags, formatProfilesMessage } from '../lib/memo-profiles.js'

const MemoProfiles = defineListReadCommand({
  readMethod: 'readProfiles',
  clientMethod: 'getRecentProfiles',
  listField: 'profiles',
  parseFlags: parseProfilesFlags,
  format: formatProfilesMessage
})

export default MemoProfiles

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:46:41.065Z","module_hash":"818b73537c8248d5e9bac0eca5d9984b4033e8a380a36116fb04a8b5f77b638f","functions":[]}
// mutate4javascript-manifest-end
