/*
  Unit tests for the profile token icons presentation component.

  The component renders one small link per token icon: an image when the view
  model carries an image URL, a jdenticon otherwise. Each link exposes the
  token id as a native tooltip and an accessible label, opens the Tokentiger
  explorer in a new tab, and is 30 pixels wide.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const ProfileTokenIcons = require('../../src/components/app-body/profile/profile-token-icons')

const ALPHA_ID = '1'.repeat(64)
const BETA_ID = '2'.repeat(64)

const ALPHA_ICON = {
  tokenId: ALPHA_ID,
  label: 'ALPHA',
  imageUrl: 'https://example.com/icons/alpha.png',
  isJdenticon: false,
  explorerUrl: `https://explorer.tokentiger.com/?tokenid=${ALPHA_ID}`,
  tooltip: ALPHA_ID
}

const BETA_ICON = {
  tokenId: BETA_ID,
  label: 'BETA',
  imageUrl: null,
  isJdenticon: true,
  explorerUrl: `https://explorer.tokentiger.com/?tokenid=${BETA_ID}`,
  tooltip: BETA_ID
}

function renderRow (tokens) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProfileTokenIcons, { tokens })
  )
}

function renderIcon (token) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProfileTokenIcons.ProfileTokenIcon, { token })
  )
}

test('renders no markup when there are no tokens', () => {
  assert.equal(renderRow([]), '')
  assert.equal(renderRow(), '')
})

test('renders one icon link per token', () => {
  const html = renderRow([ALPHA_ICON, BETA_ICON])

  const matches = html.match(/class="profile-token-icon"/g) || []
  assert.equal(matches.length, 2)
  assert.ok(html.includes(`data-token-id="${ALPHA_ID}"`))
  assert.ok(html.includes(`data-token-id="${BETA_ID}"`))
})

test('renders an image with the token image URL at 30 pixels wide', () => {
  const html = renderIcon(ALPHA_ICON)

  assert.ok(html.includes('<img'))
  assert.ok(html.includes('src="https://example.com/icons/alpha.png"'))
  assert.ok(html.includes('width="30"'))
  assert.ok(html.includes('height="30"'))
})

test('renders a jdenticon derived from the token id when there is no image', () => {
  const html = renderIcon(BETA_ICON)

  assert.ok(!html.includes('<img'))
  assert.ok(html.includes(`data-jdenticon-value="${BETA_ID}"`))
  assert.ok(html.includes('width="30"'))
})

test('exposes the token id as a native tooltip', () => {
  assert.ok(renderIcon(ALPHA_ICON).includes(`title="${ALPHA_ID}"`))
})

test('exposes the token label as the accessible label', () => {
  assert.ok(renderIcon(ALPHA_ICON).includes('aria-label="ALPHA"'))
})

test('links to the Tokentiger explorer in a new tab', () => {
  const html = renderIcon(ALPHA_ICON)

  assert.ok(html.includes(`href="${ALPHA_ICON.explorerUrl}"`))
  assert.ok(html.includes('target="_blank"'))
  assert.ok(html.includes('rel="noopener noreferrer"'))
})
