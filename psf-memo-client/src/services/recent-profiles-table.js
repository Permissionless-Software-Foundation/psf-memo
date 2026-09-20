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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-20T20:04:31.617Z","module_hash":"e57f7553060407dc4472d276c952224eebc9af601e3af89fe9823521772b867d","functions":[{"id":"func/profilePath","name":"profilePath","line":20,"end_line":22,"hash":"600b1f8066ecb8274c17a26c6ac2c753471c3ee4efc2de69558c6811a070a82c"},{"id":"func/accountDisplayName","name":"accountDisplayName","line":26,"end_line":28,"hash":"f9a24ca7336983aa345213b6c3e2e6d30add7ace5d5bcbf415d933a86f4c6271"},{"id":"func/buildRecentProfileAccount","name":"buildRecentProfileAccount","line":31,"end_line":38,"hash":"0d5ddd089881bcf323bcd3c37b2a69e4c3fad99b75845c35f8fc75cf7e2474c5"},{"id":"func/buildRecentProfilesTable","name":"buildRecentProfilesTable","line":41,"end_line":49,"hash":"8a97cc5d5925c43b411ccb2c10160648d63198ca22d861e6016fc22326786249"}]}
// mutate4javascript-manifest-end
