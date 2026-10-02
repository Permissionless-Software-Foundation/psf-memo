/*
  Account sidebar avatar.

  Shows the authenticated account's avatar image when an avatar URL is set,
  and a jdenticon derived from the account address otherwise. Written in plain
  React.createElement style so the same module can be used by the JSX account
  page and by the acceptance adapter that renders HTML under Node.
*/

const React = require('react')
const AvatarImage = require('./avatar-image')
const JdenticonModule = require('@chris.troutner/react-jdenticon')

const Jdenticon = JdenticonModule.default || JdenticonModule

const AVATAR_SIZE = 120

function AccountAvatar ({ addr = '', url = null }) {
  if (url) {
    return React.createElement(AvatarImage, { url })
  }

  return React.createElement(
    'div',
    { className: 'account-avatar account-avatar-jdenticon' },
    React.createElement(Jdenticon, { size: String(AVATAR_SIZE), value: addr })
  )
}

AccountAvatar.AVATAR_SIZE = AVATAR_SIZE

module.exports = AccountAvatar
