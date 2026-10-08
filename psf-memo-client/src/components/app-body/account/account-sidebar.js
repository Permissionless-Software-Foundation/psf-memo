/*
  Account page sidebar.

  Mirrors the profile page sidebar for the authenticated account: the avatar,
  the bio (or a no-bio message), a Profile link to the account's own
  /profile/:addr page, the copyable BCH address, and the SLP token icons, in
  that order. Written in plain React.createElement style so the same module can
  be used by the JSX account page and by the acceptance adapter that renders
  HTML under Node.
*/

const React = require('react')
const AccountAvatar = require('../../account/account-avatar')
const ProfileAddress = require('../profile/profile-address')
const ProfileTokenIcons = require('../profile/profile-token-icons')

const NO_BIO_TEXT = 'No profile text'
const PROFILE_PATH_PREFIX = '/profile'

// The /profile/:addr path for an address, URL-encoded for use in a route.
function profilePath (addr) {
  return `${PROFILE_PATH_PREFIX}/${encodeURIComponent(addr)}`
}

function AccountSidebar ({
  addr = '',
  avatarUrl = null,
  bio = '',
  copied = false,
  onCopyAddress,
  onProfileClick,
  tokens = []
}) {
  const sections = [
    React.createElement(
      'div',
      { key: 'avatar', 'data-section': 'avatar', className: 'account-sidebar-avatar' },
      React.createElement(AccountAvatar, { addr, url: avatarUrl })
    ),
    React.createElement(
      'div',
      { key: 'bio', 'data-section': 'bio', className: 'account-sidebar-bio mt-3' },
      bio
        ? React.createElement('p', { className: 'profile-bio' }, bio)
        : React.createElement('p', { className: 'profile-bio profile-bio-empty text-muted' }, NO_BIO_TEXT)
    ),
    React.createElement(
      'div',
      { key: 'profile', 'data-section': 'profile', className: 'account-sidebar-profile' },
      React.createElement(
        'a',
        {
          className: 'account-sidebar-profile-link',
          href: profilePath(addr),
          onClick: (event) => {
            if (onProfileClick) {
              event.preventDefault()
              onProfileClick()
            }
          }
        },
        'Profile'
      )
    ),
    React.createElement(
      'div',
      { key: 'address', 'data-section': 'address', className: 'account-sidebar-address' },
      React.createElement(ProfileAddress, { address: addr, copied, onClick: onCopyAddress })
    ),
    React.createElement(
      'div',
      { key: 'tokens', 'data-section': 'tokens', className: 'account-sidebar-tokens' },
      React.createElement(ProfileTokenIcons, { tokens })
    )
  ]

  return React.createElement('div', { className: 'account-sidebar' }, sections)
}

AccountSidebar.NO_BIO_TEXT = NO_BIO_TEXT
AccountSidebar.profilePath = profilePath

module.exports = AccountSidebar

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-02T16:08:35.248Z","module_hash":"02e1b6997414b5d9a0e64464bc46a126b54fcd65711521b75bf0b8ef96d7120c","functions":[{"id":"func/AccountSidebar","name":"AccountSidebar","line":18,"end_line":52,"hash":"2d844fe533880666f76f47fbd323403d7abc0ff208f960d24621d055dd0749d2"}]}
// mutate4javascript-manifest-end
