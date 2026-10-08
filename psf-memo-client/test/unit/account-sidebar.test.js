/*
  Unit tests for the account page sidebar presentation component.

  The account sidebar mirrors the profile page sidebar: the avatar, bio,
  copyable BCH address, and SLP token icons, in that order. The bio section
  shows the profile text when set and a "No profile text" message otherwise.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const AccountSidebar = require('../../src/components/app-body/account/account-sidebar')

const ADDR = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'

function renderSidebar (props = {}) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(AccountSidebar, { addr: ADDR, ...props })
  )
}

function sectionOrder (html) {
  const order = []
  const pattern = /data-section="([^"]+)"/g
  let match
  while ((match = pattern.exec(html)) !== null) {
    order.push(match[1])
  }
  return order
}

test('renders the sidebar sections in the order avatar, bio, profile, address, tokens', () => {
  const html = renderSidebar({ bio: 'Building on BCH' })

  assert.deepEqual(sectionOrder(html), ['avatar', 'bio', 'profile', 'address', 'tokens'])
})

test('renders a Profile link to the account profile path', () => {
  const html = renderSidebar()

  assert.ok(html.includes('account-sidebar-profile-link'))
  assert.ok(html.includes(`href="/profile/${encodeURIComponent(ADDR)}"`))
  assert.ok(html.includes('>Profile<'))
})

test('shows the bio when set', () => {
  const html = renderSidebar({ bio: 'Building on BCH' })

  assert.ok(html.includes('Building on BCH'))
  assert.ok(!html.includes('No profile text'))
})

test('shows the no-bio message when no bio is set', () => {
  const html = renderSidebar({ bio: '' })

  assert.ok(html.includes('No profile text'))
})

test('shows the account address', () => {
  const html = renderSidebar()

  assert.ok(html.includes(ADDR))
})

test('shows the avatar image when an avatar URL is set', () => {
  const html = renderSidebar({ avatarUrl: 'https://example.com/avatar.png' })

  assert.ok(html.includes('<img'))
  assert.ok(html.includes('src="https://example.com/avatar.png"'))
})

test('shows a jdenticon avatar when no avatar URL is set', () => {
  const html = renderSidebar()

  assert.ok(!html.includes('<img'))
  assert.ok(html.includes(`data-jdenticon-value="${ADDR}"`))
})

test('shows a token icon for each token', () => {
  const html = renderSidebar({
    tokens: [
      {
        tokenId: '1'.repeat(64),
        label: 'ALPHA',
        imageUrl: 'https://example.com/icons/alpha.png',
        isJdenticon: false,
        explorerUrl: `https://explorer.tokentiger.com/?tokenid=${'1'.repeat(64)}`,
        tooltip: 'Alpha Token'
      }
    ]
  })

  assert.ok(html.includes(`data-token-id="${'1'.repeat(64)}"`))
})

test('renders a copy confirmation when copied is true', () => {
  const html = renderSidebar({ copied: true })

  assert.ok(html.includes('Copied to clipboard'))
})

test('does not render a copy confirmation by default', () => {
  const html = renderSidebar()

  assert.ok(!html.includes('Copied to clipboard'))
})
