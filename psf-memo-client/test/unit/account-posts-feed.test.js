/*
  Unit tests for the account posts feed renderer.

  The feed shows the account's own posts with the same card pieces as the
  profile feed (rendered post text, post options button, interactive like
  button, reply count), and shows a no-posts message when the account has none.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const { AccountPostsFeed } = require('../../src/components/app-body/account/account-posts-feed')
const AccountPage = require('../../src/services/account-page')
const { formatSeen } = require('../../src/services/post-timestamp')

const ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

function makePost (overrides = {}) {
  return {
    txid: '1'.repeat(64),
    addr: ADDRESS,
    text: 'first memo',
    replyCount: 0,
    ...overrides
  }
}

function render (props) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(AccountPostsFeed, props)
  )
}

test('shows the no-posts message when the account has none', () => {
  const html = render({ posts: [] })

  assert.equal(AccountPage.NO_POSTS_MESSAGE, 'You have no posts yet.')
  assert.ok(html.includes('account-posts-empty'))
  assert.ok(html.includes('You have no posts yet.'))
})

test('renders each post with the options button, text, like button, and reply count', () => {
  const html = render({ posts: [makePost()] })

  assert.ok(html.includes(`data-post-txid="${makePost().txid}"`))
  assert.ok(html.includes('aria-label="Post options"'))
  assert.ok(html.includes('first memo'))
  assert.ok(html.includes('post-like-button'))
  assert.ok(html.includes('post-reply-count'))
})

test('renders no post cards when the account has no posts', () => {
  const html = render({ posts: [] })

  assert.ok(!html.includes('account-post-card'))
})

test('renders every post in order', () => {
  const html = render({
    posts: [
      makePost({ txid: 'a'.repeat(64), text: 'first memo' }),
      makePost({ txid: 'b'.repeat(64), text: 'second memo' })
    ]
  })

  assert.ok(html.indexOf('first memo') < html.indexOf('second memo'))
})

test('renders the post timestamp and block number', () => {
  const html = render({
    posts: [makePost({ blockHeight: 812345, seen: 1700000000 })]
  })

  assert.ok(html.includes('Block 812345'))
  assert.ok(html.includes(formatSeen(1700000000)))
})
