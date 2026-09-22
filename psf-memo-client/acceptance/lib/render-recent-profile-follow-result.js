/*
  Acceptance rendering adapter for the Recent Profiles follow result.

  Renders the same RecentProfileFollowResult component the browser uses inside
  its result modal to a static HTML string, so acceptance assertions can inspect
  the loading indicator, the success message, the transaction id, the block
  explorer link, and the failure message without running a browser.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const RecentProfileFollowResult = require('../../src/components/app-body/recent-profiles/recent-profile-follow-result')

function renderRecentProfileFollowResult (props = {}) {
  const element = React.createElement(RecentProfileFollowResult, props)
  return ReactDOMServer.renderToStaticMarkup(element)
}

module.exports = { renderRecentProfileFollowResult }
