/*
  Acceptance rendering adapter for a post's timestamp link.

  Renders the same PostTimeLink component the browser uses to a static HTML
  string, so acceptance assertions can inspect the permalink href without
  running a browser.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const { PostTimeLink } = require('../../src/components/post-feed/post-time-link')

function renderPostTimeLink (props = {}) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(PostTimeLink, props)
  )
}

module.exports = { renderPostTimeLink }
