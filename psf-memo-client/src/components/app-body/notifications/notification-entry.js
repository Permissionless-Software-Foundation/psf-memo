/*
  One notification entry on the Notifications page.

  Names its actor with the actor's Memo display name and avatar, links both to
  the actor's profile, and shows the full BCH address as small plain text. Like
  and reply entries offer a "View Post" link that opens the referenced post's
  thread; follow entries do not. When the actor has no display name the entry
  shows the truncated address as the name, and when the actor has no avatar (or
  the profile lookup failed) it falls back to an identicon.

  Laid out as a post-style card: avatar and name in the header, the
  notification message in the body, and "View Post" in the actions row.

  Written in plain React.createElement style so the same module can be used by
  the JSX components in the browser build and by the acceptance adapter that
  renders HTML under Node.
*/

const React = require('react')
const JdenticonModule = require('@chris.troutner/react-jdenticon')
const { VIEW_POST_LABEL } = require('../../../services/notification-entry')

const Jdenticon = JdenticonModule.default || JdenticonModule

// The actor's avatar: the profile picture when present, an identicon otherwise.
function NotificationAvatar ({ addr, avatarUrl }) {
  if (avatarUrl) {
    return React.createElement('img', {
      src: avatarUrl,
      alt: 'Account avatar',
      className: 'notification-entry-avatar',
      width: 36,
      height: 36
    })
  }

  return React.createElement(
    'div',
    { className: 'notification-entry-avatar notification-entry-identicon' },
    React.createElement(Jdenticon, { value: addr, size: '36' })
  )
}

function NotificationEntry ({ entry, onViewPost, onProfileClick }) {
  if (!entry) return null

  const handleProfileClick = (event) => {
    if (!onProfileClick) return
    event.preventDefault()
    onProfileClick(entry.profilePath)
  }

  const handleViewPost = (event) => {
    event.preventDefault()
    if (onViewPost) onViewPost(entry.postTxid)
  }

  return React.createElement(
    'article',
    { className: 'notification-item' },
    React.createElement(
      'header',
      { className: 'notification-entry-header' },
      React.createElement(
        'a',
        {
          className: 'notification-entry-avatar-link',
          href: entry.profilePath,
          onClick: handleProfileClick,
          'aria-label': `View ${entry.displayName}'s profile`
        },
        React.createElement(NotificationAvatar, {
          addr: entry.addr,
          avatarUrl: entry.avatarUrl
        })
      ),
      React.createElement(
        'div',
        { className: 'notification-entry-meta' },
        React.createElement(
          'a',
          {
            className: 'notification-entry-name-link',
            href: entry.profilePath,
            onClick: handleProfileClick,
            title: entry.addr
          },
          entry.displayName
        ),
        React.createElement(
          'span',
          { className: 'notification-entry-address' },
          entry.addr
        )
      )
    ),
    React.createElement(
      'div',
      { className: 'notification-entry-body' },
      React.createElement(
        'p',
        { className: 'notification-entry-text' },
        entry.message || ''
      )
    ),
    entry.showViewPost &&
      React.createElement(
        'div',
        { className: 'notification-entry-actions' },
        React.createElement(
          'a',
          {
            className: 'notification-entry-view-post',
            href: '#',
            onClick: handleViewPost
          },
          VIEW_POST_LABEL
        )
      )
  )
}

module.exports = NotificationEntry
module.exports.NotificationAvatar = NotificationAvatar
