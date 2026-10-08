/*
  Acceptance rendering adapter for the account posts feed.

  Renders the same AccountPostsFeed component the browser account page uses to
  a static HTML string, so acceptance assertions can inspect the no-posts
  message and the post cards without running a browser.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const { AccountPostsFeed } = require('../../src/components/app-body/account/account-posts-feed')

function renderAccountPostsFeed (props = {}) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(AccountPostsFeed, props)
  )
}

module.exports = { renderAccountPostsFeed }
