/*
  Acceptance rendering adapter for the account avatars.

  Renders the same components the browser uses to a static HTML string, so
  acceptance assertions can inspect the rendered avatar image or jdenticon
  fallback without running a browser.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const AvatarImage = require('../../src/components/account/avatar-image')
const AccountAvatar = require('../../src/components/account/account-avatar')

function renderAccountAvatar (url) {
  const element = React.createElement(AvatarImage, { url })
  return ReactDOMServer.renderToStaticMarkup(element)
}

function renderAccountAvatarView ({ addr = '', url = null } = {}) {
  const element = React.createElement(AccountAvatar, { addr, url })
  return ReactDOMServer.renderToStaticMarkup(element)
}

module.exports = { renderAccountAvatar, renderAccountAvatarView }
