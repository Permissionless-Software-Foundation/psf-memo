/*
  The Follow cell of the Recent Profiles table.

  Shows a Follow or Unfollow button for the row's profile. The button is
  disabled on the viewer's own row. Clicking it reports the row's address to
  the page so it can broadcast the follow or unfollow action.

  Written in plain React.createElement style so the same module can be used by
  the JSX Recent Profiles page in the browser build and by the acceptance
  adapter that renders HTML under Node.
*/

const React = require('react')

function RecentProfileFollowButton ({ follow, onClick }) {
  if (!follow) return null

  const handleClick = (event) => {
    if (onClick) onClick(follow.addr, event)
  }

  return React.createElement(
    'button',
    {
      type: 'button',
      className: 'recent-profile-follow-button',
      disabled: Boolean(follow.disabled),
      onClick: handleClick,
      'aria-label': `${follow.label} ${follow.addr}`
    },
    follow.label
  )
}

module.exports = RecentProfileFollowButton
module.exports.RecentProfileFollowButton = RecentProfileFollowButton
