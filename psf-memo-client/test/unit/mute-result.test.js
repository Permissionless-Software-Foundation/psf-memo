/*
  Unit tests for the mute broadcast result component.

  The component shows the broadcast success message, the mute transaction id,
  and a link to that transaction on the block explorer that opens in a new tab.
  On failure it shows the broadcast error message instead.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const MuteResult = require('../../src/components/app-body/profile/mute-result')

const SAMPLE_TXID = '1111111111111111111111111111111111111111111111111111111111111111'
const MESSAGE = 'Your mute was broadcast to the Bitcoin Cash network.'
const EXPLORER_URL = `https://bch.loping.net/tx/${SAMPLE_TXID}`

function renderResult (props = {}) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(MuteResult, {
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

test('renders the mute transaction id', () => {
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

test('renders the failure message when an error is given', () => {
  const html = renderResult({ error: 'Insufficient balance' })

  assert.ok(html.includes('Insufficient balance'))
  assert.ok(!html.includes(MESSAGE))
})
