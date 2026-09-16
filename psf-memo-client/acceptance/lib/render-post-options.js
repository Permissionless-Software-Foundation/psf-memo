/*
  Acceptance rendering adapter for the shared post options menu.

  Renders the same PostOptionsMenu component the browser uses to a static HTML
  string, so acceptance assertions can inspect the button and menu markup
  without running a browser. The component's open/closed and focused state can
  be seeded through props for deterministic rendering.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const PostOptionsMenu = require('../../src/components/post-feed/post-options-menu')

function renderPostOptions (txid, options = {}) {
  const element = React.createElement(PostOptionsMenu, {
    txid,
    initialOpen: options.open,
    initialFocusedIndex: options.focusedIndex
  })
  return ReactDOMServer.renderToStaticMarkup(element)
}

module.exports = { renderPostOptions }
