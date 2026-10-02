/*
  Unit tests for the account sidebar avatar component.

  The account page sidebar shows the authenticated account's avatar. When an
  avatar URL is set it renders that image; when none is set it falls back to a
  jdenticon derived from the account address, and renders no image element.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const AccountAvatar = require('../../src/components/account/account-avatar')

const ADDR = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

function renderAvatar (props = {}) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(AccountAvatar, props))
}

test('renders the avatar image when a URL is set', () => {
  const html = renderAvatar({ addr: ADDR, url: 'https://example.com/avatar.png' })

  assert.ok(html.includes('<img'))
  assert.ok(html.includes('src="https://example.com/avatar.png"'))
  assert.ok(html.includes('alt="Account avatar"'))
})

test('renders a jdenticon when no avatar URL is set', () => {
  const html = renderAvatar({ addr: ADDR, url: null })

  assert.ok(!html.includes('<img'))
  assert.ok(html.includes(`data-jdenticon-value="${ADDR}"`))
})

test('renders a jdenticon when the URL is missing entirely', () => {
  const html = renderAvatar({ addr: ADDR })

  assert.ok(!html.includes('<img'))
  assert.ok(html.includes(`data-jdenticon-value="${ADDR}"`))
})

test('prefers the avatar image over the jdenticon when a URL is set', () => {
  const html = renderAvatar({ addr: ADDR, url: 'https://example.com/avatar.png' })

  assert.ok(!html.includes('data-jdenticon-value'))
})

test('wraps the jdenticon in the account avatar jdenticon container', () => {
  const html = renderAvatar({ addr: ADDR })

  assert.ok(html.includes('account-avatar-jdenticon'))
})
