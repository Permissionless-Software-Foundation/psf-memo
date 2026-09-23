/*
  Acceptance rendering adapter for the profile token icon row.

  Renders the same ProfileTokenIcons component the browser uses to a static
  HTML string, so acceptance assertions can inspect each token icon without
  running a browser.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const ProfileTokenIcons = require('../../src/components/app-body/profile/profile-token-icons')

function renderProfileTokenIcons (tokens = []) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProfileTokenIcons, { tokens })
  )
}

function renderProfileTokenIcon (token) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProfileTokenIcons.ProfileTokenIcon, { token })
  )
}

module.exports = { renderProfileTokenIcons, renderProfileTokenIcon }
