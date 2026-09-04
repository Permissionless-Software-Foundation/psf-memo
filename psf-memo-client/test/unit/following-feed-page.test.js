/*
  Unit tests for the following feed page controller.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const FollowingFeedPage = require('../../src/services/following-feed-page')

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

function makeWallet () {
  return {
    walletInfo: { cashAddress: MY_ADDRESS }
  }
}

function makeMemoDb (posts, pagination) {
  return {
    async getFollowingFeed (addr, { limit, offset }) {
      return { posts, pagination }
    }
  }
}

test('load returns posts from the following feed', async () => {
  const posts = [
    { txid: 'a'.repeat(64), text: 'hello from followee' },
    { txid: 'b'.repeat(64), text: 'another post' }
  ]
  const page = new FollowingFeedPage({
    memoDb: makeMemoDb(posts, { total: 2 }),
    wallet: makeWallet()
  })

  const result = await page.load()

  assert.deepEqual(result.posts, posts)
  assert.equal(result.pagination.total, 2)
  assert.equal(result.emptyBecauseNoFollows, false)
})

test('load marks empty feed at offset zero as no-follows state', async () => {
  const page = new FollowingFeedPage({
    memoDb: makeMemoDb([], { total: 0 }),
    wallet: makeWallet()
  })

  const result = await page.load()

  assert.deepEqual(result.posts, [])
  assert.equal(result.emptyBecauseNoFollows, true)
})

test('load does not mark empty paginated page as no-follows state', async () => {
  const page = new FollowingFeedPage({
    memoDb: makeMemoDb([], { total: 2 }),
    wallet: makeWallet()
  })

  const result = await page.load({ offset: 100 })

  assert.equal(result.emptyBecauseNoFollows, false)
})

test('getPost returns a loaded post by txid', async () => {
  const posts = [{ txid: 'a'.repeat(64), text: 'hello' }]
  const page = new FollowingFeedPage({
    memoDb: makeMemoDb(posts, {}),
    wallet: makeWallet()
  })

  await page.load()

  assert.equal(page.getPost('a'.repeat(64)).text, 'hello')
})

test('load forwards limit and offset to the memo db client', async () => {
  const calls = []
  const memoDb = {
    async getFollowingFeed (addr, params) {
      calls.push({ addr, params })
      return { posts: [], pagination: {} }
    }
  }
  const page = new FollowingFeedPage({ memoDb, wallet: makeWallet() })

  await page.load({ limit: 10, offset: 20 })

  assert.deepEqual(calls, [{ addr: MY_ADDRESS, params: { limit: 10, offset: 20 } }])
})

test('load defaults limit to 50 and offset to 0', async () => {
  const calls = []
  const memoDb = {
    async getFollowingFeed (addr, params) {
      calls.push({ addr, params })
      return { posts: [], pagination: {} }
    }
  }
  const page = new FollowingFeedPage({ memoDb, wallet: makeWallet() })

  await page.load()

  assert.deepEqual(calls, [{ addr: MY_ADDRESS, params: { limit: 50, offset: 0 } }])
})

test('load throws when no memo db client is provided', async () => {
  const page = new FollowingFeedPage({ wallet: makeWallet() })

  await assert.rejects(
    () => page.load(),
    /requires a memo db client/
  )
})

test('load throws when no wallet is provided', async () => {
  const page = new FollowingFeedPage({ memoDb: makeMemoDb([], {}) })

  await assert.rejects(
    () => page.load(),
    /requires an authenticated wallet/
  )
})

test('canLoadMore reflects pagination.hasMore', async () => {
  const pageMore = new FollowingFeedPage({
    memoDb: makeMemoDb([], { hasMore: true }),
    wallet: makeWallet()
  })
  await pageMore.load()
  assert.equal(pageMore.canLoadMore(), true)

  const pageDone = new FollowingFeedPage({
    memoDb: makeMemoDb([], { hasMore: false }),
    wallet: makeWallet()
  })
  await pageDone.load()
  assert.equal(pageDone.canLoadMore(), false)
})

test('exposes the following feed path', () => {
  assert.equal(FollowingFeedPage.FOLLOWING_FEED_PATH, '/posts/following')
})

test('constructor starts with emptyBecauseNoFollows false', () => {
  const page = new FollowingFeedPage({
    memoDb: makeMemoDb([], {}),
    wallet: makeWallet()
  })

  assert.equal(page.emptyBecauseNoFollows, false)
})

test('canLoadMore is false when pagination is absent', async () => {
  const page = new FollowingFeedPage({
    memoDb: makeMemoDb([], null),
    wallet: makeWallet()
  })

  await page.load()

  assert.equal(page.canLoadMore(), false)
})
