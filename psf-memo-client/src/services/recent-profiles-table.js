/*
  Build the Recent Profiles page table view model.

  The /profile/recent response already carries each profile's display name
  (name, joined from the names store) and avatar URL (profilePicUrl, joined
  from the profilePics store). The React Recent Profiles page renders the table
  from this model so the leftmost Account column — display name and avatar,
  both linking to the profile, with truncated-address and identicon fallbacks —
  and the rightmost Follow column button stay testable without a DOM.
*/

const { truncateAddr } = require('../util')

const PROFILE_PATH_PREFIX = '/profile'

// Column headers, left to right. Account is first; the other columns preserve
// the pre-existing order, with Follow replacing the former TXID column.
const RECENT_PROFILES_TABLE_HEADERS = ['Account', 'Address', 'Bio', 'Block', 'Seen', 'Follow']

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

// The Follow-column view model for one profile row: the label flips with the
// viewer's follow state, and the viewer's own row is a disabled Follow button.
function buildRecentProfileFollow (profile = {}, { myAddr = null, following = false } = {}) {
  const addr = profile.addr
  return {
    addr,
    label: following ? 'Unfollow' : 'Follow',
    disabled: Boolean(myAddr) && myAddr === addr
  }
}

// The table view model: the header row plus one row per profile. The optional
// follow options carry the viewer address and the per-address follow state.
function buildRecentProfilesTable (profiles = [], options = {}) {
  const followingByAddr = options.followingByAddr || {}
  return {
    headers: [...RECENT_PROFILES_TABLE_HEADERS],
    rows: profiles.map((profile) => ({
      addr: profile.addr,
      account: buildRecentProfileAccount(profile),
      follow: buildRecentProfileFollow(profile, {
        myAddr: options.myAddr,
        following: followingByAddr[profile.addr] === true
      })
    }))
  }
}

module.exports = {
  PROFILE_PATH_PREFIX,
  RECENT_PROFILES_TABLE_HEADERS,
  profilePath,
  accountDisplayName,
  buildRecentProfileAccount,
  buildRecentProfileFollow,
  buildRecentProfilesTable
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-22T16:15:03.059Z","module_hash":"899816a96bdb037014cce4f3606c13c0a75e8a5aad2b54c65bc61d88fa1b6c68","functions":[{"id":"func/profilePath","name":"profilePath","line":20,"end_line":22,"hash":"600b1f8066ecb8274c17a26c6ac2c753471c3ee4efc2de69558c6811a070a82c"},{"id":"func/accountDisplayName","name":"accountDisplayName","line":26,"end_line":28,"hash":"f9a24ca7336983aa345213b6c3e2e6d30add7ace5d5bcbf415d933a86f4c6271"},{"id":"func/buildRecentProfileAccount","name":"buildRecentProfileAccount","line":31,"end_line":38,"hash":"0d5ddd089881bcf323bcd3c37b2a69e4c3fad99b75845c35f8fc75cf7e2474c5"},{"id":"func/buildRecentProfileFollow","name":"buildRecentProfileFollow","line":42,"end_line":49,"hash":"5d27510293b1891f52b67b6229c6d85c14af5bec82d3135e0fca012280c17823"},{"id":"func/buildRecentProfilesTable","name":"buildRecentProfilesTable","line":53,"end_line":66,"hash":"de0562f3ccdf5d0ee27891d5279e561af5cac3417f65ca88baa84038bdbe4c0b"}]}
// mutate4javascript-manifest-end
