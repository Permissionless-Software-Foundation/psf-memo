/*
  Pure account avatar image component.

  Renders an avatar <img> when a URL is provided and nothing when it is
  absent. Written in plain React.createElement style so the same module can
  be used by the JSX components in the browser build and by the acceptance
  adapter that renders HTML under Node.
*/

const React = require('react')

function AvatarImage ({ url }) {
  if (!url) return null

  return React.createElement('img', {
    src: url,
    alt: 'Account avatar',
    className: 'account-avatar-image'
  })
}

module.exports = AvatarImage
