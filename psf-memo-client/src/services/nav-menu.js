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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-10T03:32:37.538Z","module_hash":"f22947a984d372d80a6ae6c76e2d10257924657f288a6cfb7ab1a740b48fd31e","functions":[{"id":"func/findMenuEntry","name":"findMenuEntry","line":29,"end_line":31,"hash":"83c8f44c72b7148c42741bc9db0a975fbe033348c27ef54c2bb3cc44d515370d"},{"id":"func/isMenuEntryActive","name":"isMenuEntryActive","line":34,"end_line":37,"hash":"39f52ddf6a723750ed8403fbdd74ebb276adbadb58affcf2e360f26900b3a2dd"}]}
// mutate4javascript-manifest-end
