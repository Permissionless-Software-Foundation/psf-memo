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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-02T16:07:55.340Z","module_hash":"3c6a9c90ff8bfddc4542987f1b64b8961a03510b59d792f61809b02cded08aa3","functions":[{"id":"func/AccountAvatar","name":"AccountAvatar","line":18,"end_line":28,"hash":"6376c8edb939ecceb0b8e3e141eafc20f80c7440c2d5ed7153c8c2697a60fce5"}]}
// mutate4javascript-manifest-end
