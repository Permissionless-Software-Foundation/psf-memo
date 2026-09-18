/*
  Acceptance rendering adapter for the mute broadcast result.

  Renders the same MuteResult component the browser uses to a static HTML
  string, so acceptance assertions can inspect the success message, the mute
  transaction id, the block explorer link, and the failure message without
  running a browser.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const MuteResult = require('../../src/components/app-body/profile/mute-result')

function renderMuteResult ({ txid = '', message = '', error = '', explorerUrl = '' } = {}) {
  const element = React.createElement(MuteResult, { txid, message, error, explorerUrl })
  return ReactDOMServer.renderToStaticMarkup(element)
}

module.exports = { renderMuteResult }
