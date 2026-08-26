/*
  Unit tests for the Reply Thread Page behavior slice (src/services/reply-thread-page.js).

  Expresses the observable behavior described by specs/reply-memo.feature:
    - replying with a valid message broadcasts an OP_RETURN with the Memo reply
      prefix and reflects the reply in the thread.
    - an empty reply is rejected with a validation error; nothing is broadcast.
    - an over-long reply is rejected with a length error; nothing is broadcast.
    - the byte counter counts down from the reply limit.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const MemoReply = require('../../src/services/memo-reply')
const ReplyThreadPage = require('../../src/services/reply-thread-page')
const { fakeWallet } = require('../helpers/fake-wallet')
const { registerPageControllerTests, registerPageSubmitTests } = require('./page-controller-helpers')
const { buildPage } = require('./page-build-helpers')

const MAX = MemoReply.MAX_REPLY_BYTES // 184
const PARENT_TXID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

function fakeThread (rootTxid = PARENT_TXID) {
  const replies = []
  return { rootTxid, replies, addReply: (r) => replies.push(r) }
}

function build () {
  return buildPage({
    Page: ReplyThreadPage,
    Action: MemoReply,
    actionKey: 'memoReply',
    storeKey: 'thread',
    storeFactory: fakeThread,
    pageDeps: { parentTxid: PARENT_TXID }
  })
}

function buildBarePage (navigations) {
  return new ReplyThreadPage({ navigate: (p) => navigations.push(p) })
}

test('REPLY_THREAD_PATH constant', () => {
  assert.equal(ReplyThreadPage.REPLY_THREAD_PATH, '/posts/thread')
})

test('the byte counter counts down from the reply limit for an empty reply', () => {
  const { page } = build()
  page.setInput('')
  assert.equal(page.remainingCount(), MAX)
})

test('the byte counter counts down from the reply limit for a short reply', () => {
  const { page } = build()
  page.setInput('hello')
  assert.equal(page.remainingCount(), MAX - 5)
})

test('the byte counter counts multi-byte characters by bytes, not characters', () => {
  const { page } = build()
  page.setInput('é')
  assert.equal(page.remainingCount(), MAX - 2)
})

test('the byte counter reaches zero at the reply byte limit', () => {
  const { page } = build()
  page.setInput('x'.repeat(MAX))
  assert.equal(page.remainingCount(), 0)
})

registerPageSubmitTests({
  buildPage: build,
  verb: 'submitting',
  label: 'reply',
  busyFlag: 'replying',
  prefix: '6d03',
  validationCode: 'reply_validation',
  lengthCode: 'reply_length',
  MAX,
  successPath: null,
  assertStore: (store) => {
    assert.equal(store.replies[0].text, 'hello memo')
    assert.equal(store.replies[0].parentTxid, PARENT_TXID)
  },
  assertStoreEmpty: (store) => assert.equal(store.replies.length, 0)
})

test('the reply page starts idle (not replying)', () => {
  const { page } = build()
  assert.equal(page.replying, false)
})

registerPageControllerTests({
  buildPage: build,
  buildBarePage,
  busyFlag: 'replying',
  prefix: '6d03'
})

test('replying to a nested reply uses the selected parent txid', async () => {
  const nestedTxid = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  const { store, page } = build()
  page.setParent(nestedTxid)
  page.setInput('hello nested')

  const result = await page.submit()

  assert.equal(result.ok, true)
  assert.equal(store.replies[0].parentTxid, nestedTxid)
  assert.equal(store.replies[0].text, 'hello nested')
})

test('the reply page navigates to a configured success path on success', async () => {
  const wallet = fakeWallet()
  const thread = fakeThread()
  const memoReply = new MemoReply({ wallet, thread })
  const navigations = []
  const page = new ReplyThreadPage({
    memoReply,
    navigate: (p) => navigations.push(p),
    successPath: '/custom-path',
    parentTxid: PARENT_TXID
  })
  page.setInput('hello memo')

  const result = await page.submit()

  assert.equal(result.ok, true)
  assert.deepEqual(navigations, ['/custom-path'])
})
