/*
  Unit tests for the like broadcast result component.

  The component shows the broadcast success message, the like transaction id,
  and a link to that transaction on the block explorer that opens in a new tab.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const LikeResult = require('../../src/components/post-feed/like-result')

const SAMPLE_TXID = '1111111111111111111111111111111111111111111111111111111111111111'
const MESSAGE = 'Your like was broadcast to the Bitcoin Cash network.'
const EXPLORER_URL = `https://bch.loping.net/tx/${SAMPLE_TXID}`

function renderResult (props = {}) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(LikeResult, {
      txid: SAMPLE_TXID,
      message: MESSAGE,
      explorerUrl: EXPLORER_URL,
      ...props
    })
  )
}

test('renders the broadcast success message', () => {
  const html = renderResult()

  assert.ok(html.includes(MESSAGE))
})

test('renders the like transaction id', () => {
  const html = renderResult()

  assert.ok(html.includes(SAMPLE_TXID))
})

test('renders a link to the block explorer', () => {
  const html = renderResult()

  assert.match(html, new RegExp(`href="${EXPLORER_URL}"`))
})

test('the explorer link opens in a new tab', () => {
  const html = renderResult()

  assert.match(html, /target="_blank"/)
})

test('renders no link without a transaction id', () => {
  const html = renderResult({ txid: '' })

  assert.ok(!html.includes('<a '))
})
