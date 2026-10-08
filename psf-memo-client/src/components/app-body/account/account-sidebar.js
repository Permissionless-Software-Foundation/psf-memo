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
const { profilePath } = require('../../../services/profile-path')

const NO_BIO_TEXT = 'No profile text'

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
// {"version":1,"tested_at":"2026-10-08T21:00:40.791Z","module_hash":"6d92ca5e8c49eb71ecc3064b3dac539419481c8bd37f3d7ce6aebded9b3ae3c1","functions":[{"id":"func/AccountSidebar","name":"AccountSidebar","line":20,"end_line":73,"hash":"ef7ac897bfd3f54bbe3003c9d51a71524a3b72b9a295cb7d8db792f1f6b2cf30"}]}
// mutate4javascript-manifest-end
