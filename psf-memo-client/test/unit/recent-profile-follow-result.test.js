/*
  Unit tests for the Recent Profile follow broadcast result component.

  While a broadcast is pending the modal body shows a loading indicator; on
  success it shows the broadcast success message, the transaction id, and a link
  to the block explorer that opens in a new tab; on failure it shows the
  broadcast error in red.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const RecentProfileFollowResult = require('../../src/components/app-body/recent-profiles/recent-profile-follow-result')

const SAMPLE_TXID = '1111111111111111111111111111111111111111111111111111111111111111'
const MESSAGE = 'Your follow was broadcast to the Bitcoin Cash network.'
const EXPLORER_URL = `https://bch.loping.net/tx/${SAMPLE_TXID}`

function render (props = {}) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(RecentProfileFollowResult, {
      txid: SAMPLE_TXID,
      message: MESSAGE,
      explorerUrl: EXPLORER_URL,
      ...props
    })
  )
}

test('renders the broadcast success message', () => {
  assert.ok(render().includes(MESSAGE))
})

test('renders the follow transaction id', () => {
  assert.ok(render().includes(SAMPLE_TXID))
})

test('renders a link to the block explorer that opens in a new tab', () => {
  const html = render()

  assert.match(html, new RegExp(`href="${EXPLORER_URL}"`))
  assert.match(html, /target="_blank"/)
})

test('renders no transaction link without a txid', () => {
  assert.ok(!render({ txid: '' }).includes('<a '))
})

test('renders the failure message in red when an error is given', () => {
  const html = render({ error: 'Insufficient balance' })

  assert.ok(html.includes('Insufficient balance'))
  assert.match(html, /recent-profile-follow-error/)
  assert.ok(!html.includes(MESSAGE))
})

test('renders a loading indicator while the broadcast is pending', () => {
  const html = render({ loading: true })

  assert.match(html, /recent-profile-follow-loading/)
  assert.ok(!html.includes(MESSAGE))
})
