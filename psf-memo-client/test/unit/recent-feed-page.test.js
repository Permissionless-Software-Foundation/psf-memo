/*
  Unit tests for the recent feed page controller.

  The recent feed page is a thin, testable wrapper around the MemoDb client.
  It loads the paginated list of recent posts and exposes each post so the
  view can render properties such as the like count.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const RecentFeedPage = require('../../src/services/recent-feed-page')

function makeMemoDb (posts, pagination) {
  return {
    async getRecentPosts ({ limit, offset }) {
      return { posts, pagination }
    }
  }
}

test('load returns posts with like counts', async () => {
  const posts = [
    { txid: 'a'.repeat(64), likeCount: 17 },
    { txid: 'b'.repeat(64), likeCount: 3 }
  ]
  const page = new RecentFeedPage({ memoDb: makeMemoDb(posts, { total: 2 }) })

  const result = await page.load()

  assert.deepEqual(result.posts, posts)
  assert.equal(result.pagination.total, 2)
})

test('getPost returns the like count for a loaded post', async () => {
  const posts = [{ txid: 'a'.repeat(64), likeCount: 17 }]
  const page = new RecentFeedPage({ memoDb: makeMemoDb(posts, {}) })

  await page.load()

  assert.equal(page.getPost('a'.repeat(64)).likeCount, 17)
})

test('load forwards limit and offset to the memo db client', async () => {
  const calls = []
  const memoDb = {
    async getRecentPosts (params) {
      calls.push(params)
      return { posts: [], pagination: {} }
    }
  }
  const page = new RecentFeedPage({ memoDb })

  await page.load({ limit: 10, offset: 20 })

  assert.deepEqual(calls, [{ limit: 10, offset: 20 }])
})

test('load forwards the viewer address to the memo db client when a wallet is provided', async () => {
  const calls = []
  const memoDb = {
    async getRecentPosts (params) {
      calls.push(params)
      return { posts: [], pagination: {} }
    }
  }
  const wallet = { walletInfo: { cashAddress: 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d' } }
  const page = new RecentFeedPage({ memoDb, wallet })

  await page.load({ limit: 10, offset: 20 })

  assert.deepEqual(calls, [{ limit: 10, offset: 20, viewer: 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d' }])
})

test('load omits viewer address when no wallet is provided', async () => {
  const calls = []
  const memoDb = {
    async getRecentPosts (params) {
      calls.push(params)
      return { posts: [], pagination: {} }
    }
  }
  const page = new RecentFeedPage({ memoDb })

  await page.load({ limit: 10, offset: 20 })

  assert.deepEqual(calls, [{ limit: 10, offset: 20 }])
})

test('load defaults limit to 50 and offset to 0', async () => {
  const calls = []
  const memoDb = {
    async getRecentPosts (params) {
      calls.push(params)
      return { posts: [], pagination: {} }
    }
  }
  const page = new RecentFeedPage({ memoDb })

  await page.load()

  assert.deepEqual(calls, [{ limit: 50, offset: 0 }])
})

test('load throws when no memo db client is provided', async () => {
  const page = new RecentFeedPage({})

  await assert.rejects(
    () => page.load(),
    /requires a memo db client/
  )
})
