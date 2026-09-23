/*
  Profile token icon row.

  Shows one small icon for each SLP token held by the profile address: the
  token's mutable-data image when the view model has one, a jdenticon derived
  from the token id otherwise. Each icon is a link to the Tokentiger explorer
  that opens in a new tab, carries the token id as a native tooltip, and
  exposes the token label as its accessible label.

  Written in plain React.createElement style so the same module can be used by
  the JSX profile page in the browser build and by the acceptance adapter that
  renders HTML under Node.
*/

const React = require('react')
const JdenticonModule = require('@chris.troutner/react-jdenticon')

const Jdenticon = JdenticonModule.default || JdenticonModule

const TOKEN_ICON_SIZE = 30
const TOKEN_EXPLORER_REL = 'noopener noreferrer'

function ProfileTokenImage ({ token }) {
  return React.createElement('img', {
    src: token.imageUrl,
    alt: token.label,
    className: 'profile-token-icon-image',
    width: TOKEN_ICON_SIZE,
    height: TOKEN_ICON_SIZE
  })
}

function ProfileTokenJdenticon ({ token }) {
  return React.createElement(
    'span',
    { className: 'profile-token-icon-jdenticon' },
    React.createElement(Jdenticon, { value: token.tokenId, size: String(TOKEN_ICON_SIZE) })
  )
}

function ProfileTokenIcon ({ token }) {
  if (!token) return null

  return React.createElement(
    'a',
    {
      className: 'profile-token-icon',
      href: token.explorerUrl,
      target: '_blank',
      rel: TOKEN_EXPLORER_REL,
      title: token.tooltip,
      'aria-label': token.label,
      'data-token-id': token.tokenId
    },
    token.imageUrl
      ? React.createElement(ProfileTokenImage, { token })
      : React.createElement(ProfileTokenJdenticon, { token })
  )
}

function ProfileTokenIcons ({ tokens = [] }) {
  if (!Array.isArray(tokens) || tokens.length === 0) return null

  return React.createElement(
    'div',
    { className: 'profile-token-icons d-flex flex-wrap gap-1 mt-3' },
    tokens.map((token) => React.createElement(ProfileTokenIcon, { key: token.tokenId, token }))
  )
}

ProfileTokenIcons.ProfileTokenIcon = ProfileTokenIcon
ProfileTokenIcons.TOKEN_ICON_SIZE = TOKEN_ICON_SIZE

module.exports = ProfileTokenIcons
