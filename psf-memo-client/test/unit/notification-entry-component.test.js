/*
  Unit tests for the notification entry renderer.

  The renderer names its actor with the display name and avatar, links both to
  the actor's profile, shows the full address as plain text, and offers a
  "View Post" link only for like and reply notifications. It falls back to an
  identicon when the actor has no avatar.

  Written against the same rendering adapter seam the acceptance suite uses so
  the module stays covered by the standard unit suite.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const NotificationEntry = require('../../src/components/app-body/notifications/notification-entry')

const ALICE = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
const PROFILE_PATH = `/profile/${encodeURIComponent(ALICE)}`
const VIEW_POST_LABEL = 'View Post'

function makeEntry (overrides = {}) {
  return {
    type: 'like',
    txid: 'a'.repeat(64),
    addr: ALICE,
    postTxid: 'b'.repeat(64),
    displayName: 'alice',
    avatarUrl: null,
    profilePath: PROFILE_PATH,
    showViewPost: true,
    message: 'liked your post',
    ...overrides
  }
}

function render (entry) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(NotificationEntry, { entry })
  )
}

test('renders nothing without an entry', () => {
  assert.equal(render(null), '')
})

test('renders the display name, full address, and message', () => {
  const html = render(makeEntry())

  assert.ok(html.includes('alice'))
  assert.ok(html.includes(ALICE))
  assert.ok(html.includes('liked your post'))
})

test('renders the avatar image when the actor has an avatar URL', () => {
  const html = render(makeEntry({ avatarUrl: 'https://example.com/alice.png' }))

  assert.match(html, /<img[^>]+src="https:\/\/example\.com\/alice\.png"/)
  assert.doesNotMatch(html, /notification-entry-identicon/)
})

test('renders an identicon when the actor has no avatar URL', () => {
  const html = render(makeEntry({ avatarUrl: null }))

  assert.match(html, /notification-entry-identicon/)
  assert.match(html, /data-jdenticon-value/)
  assert.doesNotMatch(html, /<img/)
})

test('links the avatar and display name to the actor profile', () => {
  const html = render(makeEntry())

  assert.ok(html.includes('class="notification-entry-avatar-link"'))
  assert.ok(html.includes('class="notification-entry-name-link"'))
  assert.equal(html.split(`href="${PROFILE_PATH}"`).length - 1, 2)
})

test('offers a View Post link when the notification references a post', () => {
  const html = render(makeEntry({ showViewPost: true }))

  assert.ok(html.includes(VIEW_POST_LABEL))
  assert.ok(html.includes('class="notification-entry-view-post"'))
})

test('offers no View Post link when the notification does not reference a post', () => {
  const html = render(makeEntry({ showViewPost: false }))

  assert.ok(!html.includes(VIEW_POST_LABEL))
  assert.ok(!html.includes('notification-entry-view-post'))
})

test('renders an empty message when the notification has no text', () => {
  const html = render(makeEntry({ message: undefined }))

  assert.match(html, /class="notification-entry-text"[^>]*><\/p>/)
})
