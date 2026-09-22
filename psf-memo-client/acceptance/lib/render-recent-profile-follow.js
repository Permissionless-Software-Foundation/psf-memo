/*
  Acceptance rendering adapter for the Recent Profiles follow button.

  Renders the same RecentProfileFollowButton component the browser uses to a
  static HTML string, so acceptance assertions can inspect the Follow/Unfollow
  label and the disabled state without running a browser.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const RecentProfileFollowButton = require('../../src/components/app-body/recent-profiles/recent-profile-follow-button')

function renderRecentProfileFollowButton (follow) {
  const element = React.createElement(RecentProfileFollowButton, { follow })
  return ReactDOMServer.renderToStaticMarkup(element)
}

module.exports = { renderRecentProfileFollowButton }
