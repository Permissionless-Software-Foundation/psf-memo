/*
  Build the Recent Profiles page table view model.

  The /profile/recent response already carries each profile's display name
  (name, joined from the names store) and avatar URL (profilePicUrl, joined
  from the profilePics store). The React Recent Profiles page renders the table
  from this model so the leftmost Account column — display name and avatar,
  both linking to the profile, with truncated-address and identicon fallbacks —
  stays testable without a DOM.
*/

const { truncateAddr } = require('../util')

const PROFILE_PATH_PREFIX = '/profile'

// Column headers, left to right. Account is first; the other columns preserve
// the pre-existing order.
const RECENT_PROFILES_TABLE_HEADERS = ['Account', 'Address', 'Bio', 'Block', 'Seen', 'TXID']

function profilePath (addr) {
  return `${PROFILE_PATH_PREFIX}/${encodeURIComponent(addr)}`
}

// The name to show in the account cell: the display name when present, the
// truncated address otherwise.
function accountDisplayName (addr, name) {
  return name || truncateAddr(addr, 24)
}

// The account-cell view model for one profile.
function buildRecentProfileAccount (profile = {}) {
  return {
    addr: profile.addr,
    displayName: accountDisplayName(profile.addr, profile.name),
    avatarUrl: profile.profilePicUrl || null,
    profilePath: profilePath(profile.addr)
  }
}

// The table view model: the header row plus one row per profile.
function buildRecentProfilesTable (profiles = []) {
  return {
    headers: [...RECENT_PROFILES_TABLE_HEADERS],
    rows: profiles.map((profile) => ({
      addr: profile.addr,
      account: buildRecentProfileAccount(profile)
    }))
  }
}

module.exports = {
  PROFILE_PATH_PREFIX,
  RECENT_PROFILES_TABLE_HEADERS,
  profilePath,
  accountDisplayName,
  buildRecentProfileAccount,
  buildRecentProfilesTable
}
