/*
  Pure helpers for the memo-profiles read command.

  The command reads one page of the recent-profiles list from psf-memo-db. This
  module owns the page defaults, the flag validation, and the human-readable
  summary of each profile's identity and recency fields, so the command is a
  thin wiring layer over the shared reporter and the read-only Memo DB client.
*/

// Local libraries
import { parseNonNegativeInteger } from './page-flags.js'
import { formatPageSummary } from './page-summary.js'

// The default page matches the web client and the DB route's own default.
export const DEFAULT_PROFILES_LIMIT = 50
export const DEFAULT_PROFILES_OFFSET = 0

// Resolve the recent-profiles page from command-line flags.
export function parseProfilesFlags (flags = {}) {
  return {
    limit: parseNonNegativeInteger(flags.limit, DEFAULT_PROFILES_LIMIT, '--limit'),
    offset: parseNonNegativeInteger(flags.offset, DEFAULT_PROFILES_OFFSET, '--offset')
  }
}

// Render the human-readable recent-profiles summary: the profile count, one
// line per profile (address, display name, avatar URL, bio, provenance txid,
// and the most recent qualifying post's block height and seen), then the
// service pagination unchanged.
export function formatProfilesMessage (profiles = [], pagination = {}) {
  return formatPageSummary(
    profiles,
    'profile',
    (profile) => {
      const name = profile.name || '(unset)'
      const avatar = profile.profilePicUrl || '(unset)'
      return `${profile.addr}: ${name}, avatar ${avatar}, bio ${profile.text || '(unset)'}, txid ${profile.txid}, blockHeight ${profile.blockHeight}, seen ${profile.seen}`
    },
    pagination
  )
}
