/*
  Acceptance rendering adapter for post text.

  Renders the same PostContent component the browser uses to a static HTML
  string, so acceptance assertions can inspect the resulting embed/player
  markup without running a browser.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const PostContent = require('../../src/components/post-feed/post-content')

function renderPostText (text, options = {}) {
  const element = React.createElement(PostContent, {
    text,
    initialFailedImages: options.initialFailedImages
  })
  return ReactDOMServer.renderToStaticMarkup(element)
}

module.exports = { renderPostText }
