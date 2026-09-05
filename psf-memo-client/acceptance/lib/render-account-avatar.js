/*
  Acceptance rendering adapter for the account page avatar image.

  Renders the same AvatarImage component the browser uses to a static HTML
  string, so acceptance assertions can inspect the resulting image markup
  without running a browser.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const AvatarImage = require('../../src/components/account/avatar-image')

function renderAccountAvatar (url) {
  const element = React.createElement(AvatarImage, { url })
  return ReactDOMServer.renderToStaticMarkup(element)
}

module.exports = { renderAccountAvatar }
