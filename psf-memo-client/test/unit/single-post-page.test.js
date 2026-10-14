/*
  Unit tests for the single-post permalink page controller.

  The page loads one root Memo post and its reply thread from the MemoDb
  client, paginates the replies ten per page with a "Load more replies"
  control, exposes a reply form, copies the page permalink, and surfaces the
  not-found and failed-request states. All I/O stays behind the injected memoDb
  adapter; the controller owns the observable page behavior.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const SinglePostPage = require('../../src/services/single-post-page')

function reply (txid, extra = {}) {
  return { txid, addr: 'bitcoincash:reply-author', text: `reply ${txid}`, replies: [], ...extra }
}

function makeMemoDb (threads) {
  return {
    async getPostThread (txid) {
      return threads[txid] || { post: null }
    }
  }
}

test('threadPath builds the single post permalink path', () => {
  assert.equal(SinglePostPage.threadPath('abc'), '/posts/thread/abc')
})

test('postPageUrl prepends the origin when one is given', () => {
  assert.equal(SinglePostPage.postPageUrl('abc', ''), '/posts/thread/abc')
  assert.equal(SinglePostPage.postPageUrl('abc', 'https://example.com'), 'https://example.com/posts/thread/abc')
})

test('load exposes the root post and its replies oldest-first', async () => {
  const memoDb = makeMemoDb({
    root: {
      post: {
        txid: 'root',
        text: 'the root post',
        replies: [reply('r1'), reply('r2'), reply('r3')]
      }
    }
  })
  const page = new SinglePostPage({ memoDb })

  const result = await page.load('root')

  assert.equal(result.ok, true)
  assert.equal(page.rootPost.txid, 'root')
  assert.deepEqual(page.visibleReplies().map((r) => r.txid), ['r1', 'r2', 'r3'])
})

test('load flattens nested replies so replying to a reply stays visible', async () => {
  const memoDb = makeMemoDb({
    root: {
      post: {
        txid: 'root',
        replies: [reply('r1', { replies: [reply('r1a')] }), reply('r2')]
      }
    }
  })
  const page = new SinglePostPage({ memoDb })

  await page.load('root')

  assert.deepEqual(page.visibleReplies().map((r) => r.txid), ['r1', 'r1a', 'r2'])
})

test('load shows at most ten replies per page', async () => {
  const replies = Array.from({ length: 23 }, (_, i) => reply(`r${i}`))
  const memoDb = makeMemoDb({ root: { post: { txid: 'root', replies } } })
  const page = new SinglePostPage({ memoDb })

  await page.load('root')

  assert.equal(page.visibleReplies().length, 10)
  assert.equal(page.canLoadMoreReplies(), true)
})

test('loadMoreReplies reveals the next ten replies and stops at the end', async () => {
  const replies = Array.from({ length: 21 }, (_, i) => reply(`r${i}`))
  const memoDb = makeMemoDb({ root: { post: { txid: 'root', replies } } })
  const page = new SinglePostPage({ memoDb })

  await page.load('root')
  page.loadMoreReplies()
  assert.equal(page.visibleReplies().length, 20)
  assert.equal(page.canLoadMoreReplies(), true)

  page.loadMoreReplies()
  assert.equal(page.visibleReplies().length, 21)
  assert.equal(page.canLoadMoreReplies(), false)
})

test('load reports not found when the thread has no post', async () => {
  const page = new SinglePostPage({ memoDb: makeMemoDb({}) })

  const result = await page.load('missing')

  assert.equal(result.ok, false)
  assert.equal(page.notFound, true)
  assert.equal(page.rootPost, null)
})

test('load reports the request error message', async () => {
  const memoDb = {
    async getPostThread () {
      throw new Error('Service unavailable')
    }
  }
  const page = new SinglePostPage({ memoDb })

  await page.load('root')

  assert.equal(page.error, 'Service unavailable')
  assert.equal(page.notFound, false)
})

test('load clears a previous error and not-found state', async () => {
  const memoDb = makeMemoDb({ root: { post: { txid: 'root', replies: [] } } })
  const page = new SinglePostPage({ memoDb })

  await page.load('missing')
  assert.equal(page.notFound, true)

  await page.load('root')
  assert.equal(page.notFound, false)
  assert.equal(page.error, null)
})

test('showsReplyForm is true once the post loads, even with no replies', async () => {
  const memoDb = makeMemoDb({ root: { post: { txid: 'root', replies: [] } } })
  const page = new SinglePostPage({ memoDb })

  await page.load('root')

  assert.equal(page.visibleReplies().length, 0)
  assert.equal(page.showsReplyForm(), true)
})

test('getPost finds the root post and every loaded reply', async () => {
  const memoDb = makeMemoDb({
    root: { post: { txid: 'root', replies: [reply('r1')] } }
  })
  const page = new SinglePostPage({ memoDb })

  await page.load('root')

  assert.equal(page.getPost('root').txid, 'root')
  assert.equal(page.getPost('r1').txid, 'r1')
  assert.equal(page.getPost('nope'), null)
})

test('selectReply targets the chosen reply, defaulting to the root post', async () => {
  const memoDb = makeMemoDb({
    root: { post: { txid: 'root', replies: [reply('r1')] } }
  })
  const page = new SinglePostPage({ memoDb })
  await page.load('root')

  assert.equal(page.replyTargetTxid(), 'root')

  page.selectReply('r1')
  assert.equal(page.replyTargetTxid(), 'r1')

  page.clearReplyTarget()
  assert.equal(page.replyTargetTxid(), 'root')
})

test('copyLink copies the absolute permalink and shows the confirmation', async () => {
  const copied = []
  const memoDb = makeMemoDb({ root: { post: { txid: 'root', replies: [] } } })
  const page = new SinglePostPage({
    memoDb,
    origin: 'https://example.com',
    copyToClipboard: async (text) => { copied.push(text) }
  })
  await page.load('root')

  await page.copyLink()

  assert.deepEqual(copied, ['https://example.com/posts/thread/root'])
  assert.equal(page.linkCopied, true)
})

test('addReply appends a new reply and makes it visible', async () => {
  const memoDb = makeMemoDb({ root: { post: { txid: 'root', replies: [] } } })
  const page = new SinglePostPage({ memoDb })
  await page.load('root')

  page.addReply({ txid: 'new', addr: 'bitcoincash:me', text: 'hello' })

  assert.deepEqual(page.visibleReplies().map((r) => r.txid), ['new'])
})

test('load throws when no memo db client is provided', async () => {
  const page = new SinglePostPage({})

  await assert.rejects(
    () => page.load('root'),
    /requires a memo db client/
  )
})
