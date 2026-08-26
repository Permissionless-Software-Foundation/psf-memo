/*
  Unit tests for the New Post Page behavior slice (src/services/new-post.js).

  Expresses the observable behavior described by specs/memo-new.feature:
    - posting a valid memo broadcasts an OP_RETURN with the Memo post prefix and
      navigates the user to the recent feed.
    - an empty memo is rejected with a validation error; nothing is broadcast.
    - an over-long memo is rejected with a length error; nothing is broadcast.
    - the character counter counts down from the memo limit.
    - the navigation menu links to /posts/new.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const MemoPost = require('../../src/services/memo-post')
const NewPostPage = require('../../src/services/new-post')
const { fakeWallet } = require('../helpers/fake-wallet')
const { registerPageControllerTests, registerPageSubmitTests } = require('./page-controller-helpers')
const { buildPage } = require('./page-build-helpers')

const MAX = MemoPost.MAX_MEMO_CHARS // 217

function fakeFeed () {
  const posts = []
  return { posts, addPost: (p) => posts.push(p) }
}

function build () {
  return buildPage({
    Page: NewPostPage,
    Action: MemoPost,
    actionKey: 'memoPost',
    storeKey: 'feed',
    storeFactory: fakeFeed
  })
}

function buildBarePage (navigations) {
  return new NewPostPage({ navigate: (p) => navigations.push(p) })
}

test('NEW_POST_PATH and RECENT_FEED_PATH constants', () => {
  assert.equal(NewPostPage.NEW_POST_PATH, '/posts/new')
  assert.equal(NewPostPage.RECENT_FEED_PATH, '/posts/recent')
})

test('the new post page is linked from the navigation menu', () => {
  const { page } = build()
  assert.equal(page.hasMenuLink('/posts/new'), true)
})

test('the character counter counts down from the memo limit for an empty memo', () => {
  const { page } = build()
  page.setInput('')
  assert.equal(page.remainingCount(), MAX)
})

test('the character counter counts down from the memo limit for a short memo', () => {
  const { page } = build()
  page.setInput('hello')
  assert.equal(page.remainingCount(), MAX - 5)
})

test('the character counter reaches zero at the memo limit', () => {
  const { page } = build()
  page.setInput('x'.repeat(MAX))
  assert.equal(page.remainingCount(), 0)
})

registerPageSubmitTests({
  buildPage: build,
  verb: 'posting',
  label: 'memo',
  busyFlag: 'posting',
  prefix: '6d02',
  validationCode: 'memo_validation',
  lengthCode: 'memo_length',
  MAX,
  successPath: '/posts/recent',
  assertBroadcastMsg: (broadcast) => assert.equal(broadcast.msg, 'hello memo'),
  assertStore: (store) => assert.equal(store.posts[0].text, 'hello memo'),
  assertStoreEmpty: (store) => assert.equal(store.posts.length, 0)
})

test('the new post page starts idle (not posting)', () => {
  const { page } = build()
  assert.equal(page.posting, false)
})

registerPageControllerTests({
  buildPage: build,
  buildBarePage,
  busyFlag: 'posting',
  prefix: '6d02'
})

test('a failed broadcast surfaces a different real error message', async () => {
  const wallet = fakeWallet()
  wallet.failWith = 'Insufficient balance'
  const page = new NewPostPage({
    memoPost: new MemoPost({ wallet }),
    navigate: () => {}
  })
  page.setInput('hello memo')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.match(page.broadcastError, /Insufficient balance/)
})

test('a broadcast failure with an empty message falls back to a string form', async () => {
  const wallet = fakeWallet()
  // Throw an Error with an empty message so the message fallback path is exercised.
  wallet.sendOpReturn = async () => { throw new Error('') }
  const page = new NewPostPage({ memoPost: new MemoPost({ wallet }), navigate: () => {} })
  page.setInput('hello memo')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(page.submitError, 'broadcast')
  // The real (string) error is surfaced even though the message was empty.
  assert.equal(typeof page.broadcastError, 'string')
  assert.ok(page.broadcastError.length > 0)
})
