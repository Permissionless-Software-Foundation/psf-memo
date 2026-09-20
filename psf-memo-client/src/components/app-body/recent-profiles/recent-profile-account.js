/*
  The Account cell of the Recent Profiles table.

  Shows the profile's display name and avatar, links both to the profile, and
  falls back to an identicon when the profile has no avatar. The display name
  itself already carries the truncated-address fallback from the view model.

  Written in plain React.createElement style so the same module can be used by
  the JSX Recent Profiles page in the browser build and by the acceptance
  adapter that renders HTML under Node.
*/

const React = require('react')
const JdenticonModule = require('@chris.troutner/react-jdenticon')

const Jdenticon = JdenticonModule.default || JdenticonModule

// The profile's avatar: the profile picture when present, an identicon
// otherwise.
function RecentProfileAvatar ({ account }) {
  if (account.avatarUrl) {
    return React.createElement('img', {
      src: account.avatarUrl,
      alt: 'Account avatar',
      className: 'recent-profile-avatar',
      width: 36,
      height: 36
    })
  }

  return React.createElement(
    'div',
    { className: 'recent-profile-avatar recent-profile-identicon' },
    React.createElement(Jdenticon, { value: account.addr, size: '36' })
  )
}

function RecentProfileAccount ({ account, onProfileClick }) {
  if (!account) return null

  const handleProfileClick = (event) => {
    if (!onProfileClick) return
    event.preventDefault()
    onProfileClick(account.profilePath)
  }

  return React.createElement(
    'div',
    { className: 'recent-profile-account' },
    React.createElement(
      'a',
      {
        className: 'recent-profile-avatar-link',
        href: account.profilePath,
        onClick: handleProfileClick,
        'aria-label': `View ${account.displayName}'s profile`
      },
      React.createElement(RecentProfileAvatar, { account })
    ),
    React.createElement(
      'a',
      {
        className: 'recent-profile-name-link',
        href: account.profilePath,
        onClick: handleProfileClick,
        title: account.addr
      },
      account.displayName
    )
  )
}

module.exports = RecentProfileAccount
module.exports.RecentProfileAvatar = RecentProfileAvatar
