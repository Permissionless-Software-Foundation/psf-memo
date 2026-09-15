/*
  Unit tests for the New Post page controller.

  The page controller wraps the Memo post behavior, exposes a remaining
  character count, shows a success/failure result after broadcast, and
  navigates to the recent feed when that result is dismissed.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const NewPostPage = require('../../src/services/new-post')
const MemoPost = require('../../src/services/memo-post')

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const SAMPLE_TXID = '05280746adc9611baf0d6ae833c01343f19ef16a7c9434acc682dde129ae2622'

function makeWallet (address = MY_ADDRESS, txid = SAMPLE_TXID) {
  return {
    walletInfo: { cashAddress: address },
    broadcasts: [],
    async getUtxos () {
      return []
    },
    async sendOpReturn (msg, prefix) {
      this.broadcasts.push({ msg, prefix })
      if (this.failWith) throw new Error(this.failWith)
      return txid
    }
  }
}

function makeMemoPost (opts = {}) {
  const wallet = makeWallet(opts.address, opts.txid)
  if (opts.failWith) wallet.failWith = opts.failWith
  const feed = { posts: [], addPost (post) { this.posts.push(post) } }
  return { wallet, feed, memoPost: new MemoPost({ wallet, feed }) }
}

test('the in-flight flag starts false', () => {
  const page = new NewPostPage({ navigate: () => {} })

  assert.equal(page.posting, false)
})

test('NEW_POST_PATH and RECENT_FEED_PATH constants', () => {
  assert.equal(NewPostPage.NEW_POST_PATH, '/posts/new')
  assert.equal(NewPostPage.RECENT_FEED_PATH, '/posts/recent')
})

test('explorerUrl builds a bch.loping.net transaction link', () => {
  assert.equal(
    NewPostPage.explorerUrl(SAMPLE_TXID),
    `https://bch.loping.net/tx/${SAMPLE_TXID}`
  )
  assert.equal(NewPostPage.explorerUrl(''), '')
  const page = new NewPostPage({ navigate: () => {} })
  assert.equal(page.explorerUrl(SAMPLE_TXID), NewPostPage.explorerUrl(SAMPLE_TXID))
})

test('the new post page is linked from the navigation menu', () => {
  const page = new NewPostPage({ navigate: () => {} })

  assert.equal(page.hasMenuLink('/posts/new'), true)
})

test('remainingCount returns the full budget for empty input', () => {
  const { memoPost } = makeMemoPost()
  const page = new NewPostPage({ memoPost, navigate: () => {} })

  assert.equal(page.remainingCount(), MemoPost.MAX_MEMO_CHARS)
})

test('remainingCount subtracts the character length of the input', () => {
  const { memoPost } = makeMemoPost()
  const page = new NewPostPage({ memoPost, navigate: () => {} })
  page.setInput('hello')

  assert.equal(page.remainingCount(), MemoPost.MAX_MEMO_CHARS - 5)
})

test('submit does not navigate until the success modal is dismissed', async () => {
  const navigated = []
  const { memoPost } = makeMemoPost()
  const page = new NewPostPage({
    memoPost,
    navigate: (path) => navigated.push(path)
  })
  page.setInput('hello memo')

  const result = await page.submit()

  assert.equal(result.ok, true)
  assert.equal(result.txid, SAMPLE_TXID)
  assert.equal(page.showResultModal, true)
  assert.equal(page.lastResult.txid, SAMPLE_TXID)
  assert.deepEqual(navigated, [])

  page.dismissResult()

  assert.equal(page.showResultModal, false)
  assert.deepEqual(navigated, [NewPostPage.RECENT_FEED_PATH])
})

test('submit records a validation error for empty input and does not open the modal', async () => {
  const navigated = []
  const { memoPost } = makeMemoPost()
  const page = new NewPostPage({
    memoPost,
    navigate: (path) => navigated.push(path)
  })
  page.setInput('')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'memo_validation')
  assert.equal(page.showResultModal, false)
  assert.deepEqual(navigated, [])
})

test('submit records a length error for over-long input and does not open the modal', async () => {
  const { memoPost } = makeMemoPost()
  const page = new NewPostPage({ memoPost, navigate: () => {} })
  page.setInput('a'.repeat(MemoPost.MAX_MEMO_CHARS + 1))

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'memo_length')
  assert.equal(page.showResultModal, false)
})

test('a failed broadcast opens the failure modal and stays on the page after dismiss', async () => {
  const navigated = []
  const { memoPost } = makeMemoPost({ failWith: 'Insufficient balance' })
  const page = new NewPostPage({
    memoPost,
    navigate: (path) => navigated.push(path)
  })
  page.setInput('hello memo')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'broadcast')
  assert.match(result.message, /Insufficient balance/)
  assert.equal(page.showResultModal, true)
  assert.deepEqual(navigated, [])

  page.dismissResult()

  assert.equal(page.showResultModal, false)
  assert.deepEqual(navigated, [])
})

test('submit records a broadcast error when no memo post handler is injected', async () => {
  const page = new NewPostPage({ navigate: () => {} })
  page.setInput('hello memo')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'broadcast')
  assert.match(result.message, /New post requires a memo post handler/)
  assert.equal(page.showResultModal, true)
})
