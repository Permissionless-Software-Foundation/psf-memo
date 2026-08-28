/*
  Unit tests for the topic feed page controller.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const TopicFeedPage = require('../../src/services/topic-feed-page')

function makeMemoDb (posts, pagination) {
  return {
    async getTopicPosts (room, { limit, offset }) {
      return { posts, pagination }
    }
  }
}

test('load returns posts for the topic', async () => {
  const posts = [
    { txid: 'a'.repeat(64), text: 'hello bitcoin' },
    { txid: 'b'.repeat(64), text: 'bitcoin again' }
  ]
  const page = new TopicFeedPage({ memoDb: makeMemoDb(posts, { total: 2 }), room: 'bitcoin' })

  const result = await page.load()

  assert.deepEqual(result.posts, posts)
})

test('load forwards limit and offset to the memo db client', async () => {
  const calls = []
  const memoDb = {
    async getTopicPosts (room, params) {
      calls.push({ room, params })
      return { posts: [], pagination: {} }
    }
  }
  const page = new TopicFeedPage({ memoDb, room: 'bitcoin' })

  await page.load({ limit: 10, offset: 20 })

  assert.deepEqual(calls, [{ room: 'bitcoin', params: { limit: 10, offset: 20 } }])
})

test('load defaults limit and offset', async () => {
  const calls = []
  const memoDb = {
    async getTopicPosts (room, params) {
      calls.push(params)
      return { posts: [], pagination: {} }
    }
  }
  const page = new TopicFeedPage({ memoDb, room: 'bitcoin' })

  await page.load()

  assert.deepEqual(calls, [{ limit: 100, offset: 0 }])
})

test('stores the pagination returned by the memo db client', async () => {
  const pagination = { limit: 100, offset: 0, total: 2, hasMore: false }
  const page = new TopicFeedPage({ memoDb: makeMemoDb([], pagination), room: 'bitcoin' })

  await page.load()

  assert.deepEqual(page.pagination, pagination)
})

test('load throws when no memo db client is provided', async () => {
  const page = new TopicFeedPage({ room: 'bitcoin' })

  await assert.rejects(
    () => page.load(),
    /requires a memo db client/
  )
})

test('load throws when no room is provided', async () => {
  const page = new TopicFeedPage({ memoDb: makeMemoDb([], {}) })

  await assert.rejects(
    () => page.load(),
    /requires a topic room/
  )
})

test('getPost returns a loaded post by txid', async () => {
  const posts = [{ txid: 'a'.repeat(64), text: 'hello bitcoin' }]
  const page = new TopicFeedPage({ memoDb: makeMemoDb(posts, {}), room: 'bitcoin' })

  await page.load()

  assert.equal(page.getPost('a'.repeat(64)).text, 'hello bitcoin')
})

test('getPost returns null for an unknown txid', async () => {
  const page = new TopicFeedPage({ memoDb: makeMemoDb([], {}), room: 'bitcoin' })

  await page.load()

  assert.equal(page.getPost('c'.repeat(64)), null)
})

test('exposes the topic feed path for a room', () => {
  assert.equal(TopicFeedPage.topicFeedPath('bitcoin'), '/topics/bitcoin')
})
