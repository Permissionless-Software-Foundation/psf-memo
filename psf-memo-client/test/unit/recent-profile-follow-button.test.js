/*
  Unit tests for the Recent Profile follow button renderer.

  The button shows Follow or Unfollow for the row's profile, is disabled on the
  viewer's own row, and reports the clicked address so the page can broadcast.
  Written against the same rendering seam the acceptance suite uses.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const RecentProfileFollowButton = require('../../src/components/app-body/recent-profiles/recent-profile-follow-button')

const ALICE = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'

function render (follow) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(RecentProfileFollowButton, { follow })
  )
}

test('renders nothing without a follow view model', () => {
  assert.equal(render(null), '')
})

test('renders the Follow label', () => {
  const html = render({ addr: ALICE, label: 'Follow', disabled: false })

  assert.match(html, /<button[^>]*>Follow<\/button>/)
})

test('renders the Unfollow label', () => {
  const html = render({ addr: ALICE, label: 'Unfollow', disabled: false })

  assert.match(html, /<button[^>]*>Unfollow<\/button>/)
})

test('disables the button on the viewer own row', () => {
  const html = render({ addr: ALICE, label: 'Follow', disabled: true })

  assert.match(html, /disabled/)
})

test('clicking reports the address', () => {
  const clicked = []
  const button = RecentProfileFollowButton({
    follow: { addr: ALICE, label: 'Follow', disabled: false },
    onClick: (addr) => clicked.push(addr)
  })

  button.props.onClick({ preventDefault: () => {} })

  assert.deepEqual(clicked, [ALICE])
})

test('clicking without a handler is a no-op', () => {
  const button = RecentProfileFollowButton({ follow: { addr: ALICE, label: 'Follow', disabled: false } })

  assert.doesNotThrow(() => button.props.onClick({ preventDefault: () => {} }))
})
