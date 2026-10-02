/*
  Account page sidebar.

  Mirrors the profile page sidebar for the authenticated account: the avatar,
  the bio (or a no-bio message), the copyable BCH address, and the SLP token
  icons, in that order. Written in plain React.createElement style so the same
  module can be used by the JSX account page and by the acceptance adapter that
  renders HTML under Node.
*/

const React = require('react')
const AccountAvatar = require('../../account/account-avatar')
const ProfileAddress = require('../profile/profile-address')
const ProfileTokenIcons = require('../profile/profile-token-icons')

const NO_BIO_TEXT = 'No profile text'

function AccountSidebar ({
  addr = '',
  avatarUrl = null,
  bio = '',
  copied = false,
  onCopyAddress,
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

module.exports = AccountSidebar
