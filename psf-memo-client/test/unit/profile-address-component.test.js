/*
  Unit tests for the profile address presentation component.

  The component shows the profile's cash address and renders a transient
  "Copied to clipboard" confirmation when its copied prop is set. It is
  presentational only: clicking the address delegates to the onClick prop.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const ProfileAddress = require('../../src/components/app-body/profile/profile-address')

const ADDR = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
const COPIED_TEXT = 'Copied to clipboard'

function render (props = {}) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProfileAddress, { address: ADDR, ...props })
  )
}

test('shows the profile address on a clickable address element', () => {
  const html = render()

  assert.ok(html.includes(ADDR))
  assert.match(html, /<button[^>]*class="profile-address-value"[^>]*>/)
})

test('does not show the copy confirmation by default', () => {
  assert.ok(!render().includes(COPIED_TEXT))
})

test('shows the copy confirmation when copied', () => {
  assert.ok(render({ copied: true }).includes(COPIED_TEXT))
})

test('clicking the address invokes the copy handler', () => {
  let clicks = 0
  const element = ProfileAddress({ address: ADDR, onClick: () => { clicks++ } })
  const addressButton = element.props.children[1]

  addressButton.props.onClick()

  assert.equal(clicks, 1)
})

test('clicking without a handler is a no-op', () => {
  const element = ProfileAddress({ address: ADDR })
  const addressButton = element.props.children[1]

  assert.doesNotThrow(() => addressButton.props.onClick())
})
