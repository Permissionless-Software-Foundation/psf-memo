/*
  App navigation menu model.

  The ordered entries shown in the navigation bar. Kept as data so the menu
  component and the acceptance run share one source of truth for each entry's
  label, path, and order. `activePaths` names the extra paths (such as the home
  route) that make an entry appear selected; it defaults to the entry's path.
*/

const NAV_MENU_ENTRIES = [
  { label: 'Posts', path: '/posts/recent', activePaths: ['/posts/recent', '/'] },
  { label: 'Topics', path: '/topics' },
  { label: 'Notifications', path: '/notifications' },
  { label: 'Profiles', path: '/profile/recent' },
  { label: 'New Post', path: '/posts/new' },
  { label: 'Search', path: '/search' },
  { label: 'Account', path: '/account' },
  { label: 'File Upload', path: '/host' },
  { label: 'File Dashboard', path: '/dashboard' },
  { label: 'BCH', path: '/bch' },
  { label: 'Tokens', path: '/slp-tokens' },
  { label: 'Wallet', path: '/wallet' },
  { label: 'Sweep', path: '/sweep' },
  { label: 'Sign', path: '/sign' },
  { label: 'Configuration', path: '/configuration' }
]

// The menu entry for a path, or undefined when the path is not in the menu.
function findMenuEntry (path, entries = NAV_MENU_ENTRIES) {
  return entries.find((entry) => entry.path === path)
}

// True when the entry is the active menu item for the current path.
function isMenuEntryActive (entry, currentPath) {
  const activePaths = entry.activePaths || [entry.path]
  return activePaths.includes(currentPath)
}

module.exports = { NAV_MENU_ENTRIES, findMenuEntry, isMenuEntryActive }
