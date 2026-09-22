/*
  Acceptance rendering adapter for the Recent Profiles follow confirmation.

  Renders the same RecentProfileFollowConfirm component the browser uses inside
  its confirmation modal to a static HTML string, so acceptance assertions can
  inspect the prompt and the Yes/No buttons without running a browser.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const RecentProfileFollowConfirm = require('../../src/components/app-body/recent-profiles/recent-profile-follow-confirm')

function renderRecentProfileFollowConfirm (props = {}) {
  const element = React.createElement(RecentProfileFollowConfirm, props)
  return ReactDOMServer.renderToStaticMarkup(element)
}

module.exports = { renderRecentProfileFollowConfirm }
