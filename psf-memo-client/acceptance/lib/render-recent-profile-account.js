/*
  Acceptance rendering adapter for the Recent Profiles account cell.

  Renders the same RecentProfileAccount component the browser uses to a static
  HTML string, so acceptance assertions can inspect the avatar, profile links,
  and display name without running a browser.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const RecentProfileAccount = require('../../src/components/app-body/recent-profiles/recent-profile-account')

function renderRecentProfileAccount (account) {
  const element = React.createElement(RecentProfileAccount, { account })
  return ReactDOMServer.renderToStaticMarkup(element)
}

module.exports = { renderRecentProfileAccount }
