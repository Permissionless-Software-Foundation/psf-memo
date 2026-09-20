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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-20T20:03:40.156Z","module_hash":"273e3b8ffe62e9652c879d86bb4945960a317d1be06756e26f847955bdc2f2a1","functions":[{"id":"func/RecentProfileAvatar","name":"RecentProfileAvatar","line":20,"end_line":36,"hash":"29e36fe30fccd9b49d07e10e6a82788fc25ed69ce9c09331e621788265f8294d"},{"id":"func/RecentProfileAccount","name":"RecentProfileAccount","line":38,"end_line":71,"hash":"29f77d9b21812ee7c11fe94c8b6661e68e2e2cf48fb845f6714f35bdfd0d391b"}]}
// mutate4javascript-manifest-end
