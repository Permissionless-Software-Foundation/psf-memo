/*
  Unit tests for the Recent Profile account cell renderer.

  The account cell shows the profile's display name and avatar, links both to
  the profile, and falls back to an identicon when the profile has no avatar.
  Written against the same rendering seam the acceptance suite uses so the
  module stays covered by the standard unit suite.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const RecentProfileAccount = require('../../src/components/app-body/recent-profiles/recent-profile-account')

const ALICE = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
const PROFILE_PATH = `/profile/${encodeURIComponent(ALICE)}`

function makeAccount (overrides = {}) {
  return {
    addr: ALICE,
    displayName: 'alice',
    avatarUrl: null,
    profilePath: PROFILE_PATH,
    ...overrides
  }
}

function render (account) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(RecentProfileAccount, { account })
  )
}

test('renders nothing without an account', () => {
  assert.equal(render(null), '')
})

test('renders the display name', () => {
  const html = render(makeAccount())

  assert.ok(html.includes('alice'))
})

test('renders the avatar image when the profile has an avatar URL', () => {
  const html = render(makeAccount({ avatarUrl: 'https://example.com/alice.png' }))

  assert.match(html, /<img[^>]+src="https:\/\/example\.com\/alice\.png"/)
  assert.doesNotMatch(html, /recent-profile-identicon/)
})

test('renders an identicon when the profile has no avatar URL', () => {
  const html = render(makeAccount({ avatarUrl: null }))

  assert.match(html, /recent-profile-identicon/)
  assert.match(html, /data-jdenticon-value/)
  assert.doesNotMatch(html, /<img/)
})

test('links the avatar and display name to the profile', () => {
  const html = render(makeAccount())

  assert.ok(html.includes('class="recent-profile-avatar-link"'))
  assert.ok(html.includes('class="recent-profile-name-link"'))
  assert.equal(html.split(`href="${PROFILE_PATH}"`).length - 1, 2)
})

// Invoke the component function directly so the anchor click handlers can be
// exercised without a DOM.
function tree (props) {
  return RecentProfileAccount(props)
}

test('clicking either account link prevents the default and navigates to the profile', () => {
  const clicked = []
  const [avatarLink, nameLink] = tree({
    account: makeAccount(),
    onProfileClick: (path) => clicked.push(path)
  }).props.children

  let prevented = 0
  const event = { preventDefault: () => { prevented += 1 } }
  avatarLink.props.onClick(event)
  nameLink.props.onClick(event)

  assert.equal(prevented, 2)
  assert.deepEqual(clicked, [PROFILE_PATH, PROFILE_PATH])
})

test('clicking an account link without a navigation handler is a no-op', () => {
  const [avatarLink, nameLink] = tree({ account: makeAccount() }).props.children

  assert.doesNotThrow(() => avatarLink.props.onClick({ preventDefault: () => {} }))
  assert.doesNotThrow(() => nameLink.props.onClick({ preventDefault: () => {} }))
})
