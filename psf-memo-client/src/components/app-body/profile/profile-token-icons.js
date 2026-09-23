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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-23T23:16:37.424Z","module_hash":"100e78cf75f31f215045ed8174562cbe0c287ce5fda2eeb001de7def5d305979","functions":[{"id":"func/ProfileTokenImage","name":"ProfileTokenImage","line":23,"end_line":31,"hash":"8081e9b604a84aef9811fb1adb8f571d623882522b6b8b12b8007e301516232e"},{"id":"func/ProfileTokenJdenticon","name":"ProfileTokenJdenticon","line":33,"end_line":39,"hash":"fc7280c0087867c1e2cd6421cb2fd1e8aa5952c4586a5aea95e18d136d47fc1d"},{"id":"func/ProfileTokenIcon","name":"ProfileTokenIcon","line":41,"end_line":59,"hash":"6db95ef5a2d2e2253c765823df1d695c177f3fa65e099efa61b4e7bfb41a2534"},{"id":"func/ProfileTokenIcons","name":"ProfileTokenIcons","line":61,"end_line":69,"hash":"08f12a59c803ab0ac6900c67dfc8840eef0d9b89163d0370077226dbb90c86c8"}]}
// mutate4javascript-manifest-end
