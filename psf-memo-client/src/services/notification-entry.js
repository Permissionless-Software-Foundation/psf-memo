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
