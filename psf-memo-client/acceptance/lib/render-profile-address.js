/*
  Acceptance rendering adapter for the profile address display.

  Renders the same ProfileAddress component the browser uses to a static HTML
  string, so acceptance assertions can inspect the address and the transient
  "Copied to clipboard" confirmation without running a browser.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const ProfileAddress = require('../../src/components/app-body/profile/profile-address')

function renderProfileAddress (props = {}) {
  const element = React.createElement(ProfileAddress, props)
  return ReactDOMServer.renderToStaticMarkup(element)
}

module.exports = { renderProfileAddress }
