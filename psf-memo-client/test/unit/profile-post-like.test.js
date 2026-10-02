/*
  Unit tests for the profile post like control.

  The profile post card must offer the same interactive like/tip control as the
  recent feed post card: an interactive heart button (not the read-only span),
  showing the post's like count. The liked/count state transitions are pure so
  they can be verified without a browser, and the button is presentational so
  its render and click delegation can be checked directly.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const ProfilePostLike = require('../../src/components/app-body/profile/profile-post-like')
const {
  initialLikeState,
  reflectLike,
  selectLikeState,
  applyLike
} = require('../../src/services/profile-post-like')

const TXID = '1111111111111111111111111111111111111111111111111111111111111111'

function render (props = {}) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProfilePostLike, { post: { txid: TXID, likeCount: 17 }, ...props })
  )
}

test('initialLikeState starts unliked with the post like count', () => {
  assert.deepEqual(initialLikeState({ likeCount: 17 }), { liked: false, count: 17 })
})

test('initialLikeState treats a missing like count as zero', () => {
  assert.deepEqual(initialLikeState({}), { liked: false, count: 0 })
})

test('initialLikeState tolerates a missing post', () => {
  assert.deepEqual(initialLikeState(null), { liked: false, count: 0 })
})

test('reflectLike marks the post liked and increments the count', () => {
  assert.deepEqual(reflectLike({ liked: false, count: 17 }), { liked: true, count: 18 })
})

test('reflectLike does not mutate the input state', () => {
  const state = { liked: false, count: 4 }
  reflectLike(state)
  assert.deepEqual(state, { liked: false, count: 4 })
})

test('selectLikeState prefers the stored state once a post has been liked', () => {
  const post = { txid: TXID, likeCount: 17 }
  const stored = { liked: true, count: 18 }

  assert.equal(selectLikeState({ [TXID]: stored }, post), stored)
})

test('selectLikeState falls back to the initial state for an unliked post', () => {
  assert.deepEqual(selectLikeState({}, { txid: TXID, likeCount: 17 }), { liked: false, count: 17 })
})

test('applyLike folds a like into a copy of the likes map', () => {
  const post = { txid: TXID, likeCount: 17 }
  const other = { liked: true, count: 2 }
  const likes = { other }

  const next = applyLike(likes, post)

  assert.deepEqual(next[TXID], { liked: true, count: 18 })
  assert.deepEqual(next.other, other)
  assert.deepEqual(likes, { other })
})

test('applyLike increments a post that was already liked in the session', () => {
  const post = { txid: TXID, likeCount: 17 }
  const likes = { [TXID]: { liked: true, count: 18 } }

  assert.deepEqual(applyLike(likes, post)[TXID], { liked: true, count: 19 })
})

test('renders an interactive like button with the count', () => {
  const html = render()

  assert.match(html, /^<button[^>]*class="post-like-button[^"]*"/)
  assert.match(html, /17/)
})

test('does not render the root as the read-only like span', () => {
  const html = render()

  assert.doesNotMatch(html, /^<span/)
})

test('renders nothing without a post', () => {
  assert.equal(render({ post: null }), '')
})

test('clicking the like button delegates to the page', () => {
  let clicks = 0
  const element = ProfilePostLike({ post: { txid: TXID, likeCount: 3 }, onClick: () => { clicks++ } })

  element.props.onClick()

  assert.equal(clicks, 1)
})
