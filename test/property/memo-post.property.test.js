/*
  Property tests for the Memo post / New Post behavior slices.

  These assert useful invariants that unit tests cover only at a few fixed
  points. The validation, counter-conservation, setInput round-trip, and
  broadcast-failure invariants are shared with the Set Name slice and live in
  behavior-helpers.js; this file supplies the Memo-post specifics and the
  menu-link idempotence property unique to the New Post page.
*/

'use strict'

const test = require('node:test')

const { seededRandom, forAll } = require('./harness')
const { registerBehaviorProperties } = require('./behavior-helpers')

const MemoPost = require('../../src/services/memo-post')
const NewPostPage = require('../../src/services/new-post')

const MAX = MemoPost.MAX_MEMO_CHARS // 217

const rng = seededRandom(20260826)

function buildPage () {
  return new NewPostPage({
    memoPost: new MemoPost({}),
    navigate: () => {},
    menuLinks: []
  })
}

function fakeFeed () {
  const posts = []
  return { posts, addPost: (p) => posts.push(p) }
}

function buildBroadcastPage ({ wallet, navigations }) {
  return new NewPostPage({
    memoPost: new MemoPost({ wallet, feed: fakeFeed() }),
    navigate: (p) => navigations.push(p)
  })
}

registerBehaviorProperties({
  Module: MemoPost,
  MAX,
  label: 'memo',
  rng,
  measure: (input) => input.length,
  buildPage,
  buildBroadcastPage
})

test('menu link registration is idempotent', async () => {
  await forAll(
    (i) => `/posts/${i}`,
    (path) => {
      const page = buildPage()
      page.addMenuLink(path)
      page.addMenuLink(path)
      page.addMenuLink(path)
      return page.menuLinks.filter((p) => p === path).length === 1
    },
    { label: 'menu link idempotence' }
  )
})
