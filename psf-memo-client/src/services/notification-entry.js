/*
  Build the Notification entry view model.

  Each notification names its actor with the actor's Memo display name and
  avatar, resolved client-side from the name and profile-picture records. The
  React Notifications page renders one entry per notification from this model
  so the naming, profile-link, and View Post behavior stay testable without a
  DOM.
*/

const { truncateAddr } = require('../util')

const PROFILE_PATH_PREFIX = '/profile'
const VIEW_POST_LABEL = 'View Post'
const VIEW_POST_TYPES = ['like', 'reply']

// The profile path for an actor address, with the address URL-encoded.
function profilePath (addr) {
  return `${PROFILE_PATH_PREFIX}/${encodeURIComponent(addr)}`
}

// The name to show for an actor: the Memo display name when present, and the
// truncated address otherwise.
function displayName (addr, profile) {
  return profile?.name || truncateAddr(addr, 24)
}

// The action text for a notification entry.
function notificationMessage (notification) {
  if (notification.type === 'reply') {
    return `replied to your post: ${notification.text || ''}`
  }
  if (notification.type === 'like') {
    return 'liked your post'
  }
  if (notification.type === 'follow') {
    return 'followed you'
  }
  return ''
}

// Build the view model for one notification. `profile` is the actor's
// resolved profile ({ name, profilePicUrl }) or null when it is unavailable.
function buildNotificationEntry (notification, profile) {
  return {
    ...notification,
    displayName: displayName(notification.addr, profile),
    avatarUrl: profile?.profilePicUrl || null,
    profilePath: profilePath(notification.addr),
    showViewPost: VIEW_POST_TYPES.includes(notification.type),
    message: notificationMessage(notification)
  }
}

module.exports = {
  PROFILE_PATH_PREFIX,
  VIEW_POST_LABEL,
  VIEW_POST_TYPES,
  profilePath,
  displayName,
  notificationMessage,
  buildNotificationEntry
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-18T19:33:01.460Z","module_hash":"8043c8e67b2834a2e0667b5e9d528ef96bb0f25ac2d45cf87ecc00505e89171e","functions":[{"id":"func/profilePath","name":"profilePath","line":18,"end_line":20,"hash":"600b1f8066ecb8274c17a26c6ac2c753471c3ee4efc2de69558c6811a070a82c"},{"id":"func/displayName","name":"displayName","line":24,"end_line":26,"hash":"4c3a77ba28e6e2e1ec50c7bf6854a51f3fe6ed85f23faa8d48745898c1ee580a"},{"id":"func/notificationMessage","name":"notificationMessage","line":29,"end_line":40,"hash":"5dd8314d32ab92867f655414252398c224e804a71b83a0bd96a18fb32595297f"},{"id":"func/buildNotificationEntry","name":"buildNotificationEntry","line":44,"end_line":53,"hash":"4707908e71b73429351a2a283aaf4e68093be66dd0e06ee0af7188fe65bcea7d"}]}
// mutate4javascript-manifest-end
