/*
  Acceptance rendering adapter for the account controls.

  Renders the same AccountControls component the browser uses to a static HTML
  string, so acceptance assertions can inspect each control's description and
  button without running a browser.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const AccountControls = require('../../src/components/account/account-controls')

function renderAccountControls (controls = []) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(AccountControls, { controls })
  )
}

module.exports = { renderAccountControls }
