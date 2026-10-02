/*
  Acceptance rendering adapter for the account page sidebar.

  Renders the same AccountSidebar component the browser uses to a static HTML
  string, so acceptance assertions can inspect the sidebar sections and their
  order without running a browser.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const AccountSidebar = require('../../src/components/app-body/account/account-sidebar')

function renderAccountSidebar (props = {}) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(AccountSidebar, props)
  )
}

module.exports = { renderAccountSidebar }
