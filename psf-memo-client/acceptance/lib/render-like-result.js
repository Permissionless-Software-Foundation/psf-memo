/*
  Acceptance rendering adapter for the like broadcast result.

  Renders the same LikeResult component the browser uses to a static HTML
  string, so acceptance assertions can inspect the success message, the like
  transaction id, and the block explorer link without running a browser.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const LikeResult = require('../../src/components/post-feed/like-result')

function renderLikeResult ({ txid = '', message = '', explorerUrl = '' } = {}) {
  const element = React.createElement(LikeResult, { txid, message, explorerUrl })
  return ReactDOMServer.renderToStaticMarkup(element)
}

module.exports = { renderLikeResult }
