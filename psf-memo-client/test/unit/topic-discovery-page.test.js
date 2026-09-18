/*
  Unit tests for the topic discovery page controller.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const TopicDiscoveryPage = require('../../src/services/topic-discovery-page')

function makeMemoDb ({ topics = [], pagination = null } = {}) {
  const calls = []
  return {
    calls,
    async getTopics (opts) {
      calls.push(opts)
      return { topics, pagination }
    }
  }
}

test('load returns topics with post counts', async () => {
  const topics = [
    { room: 'bitcoin', postCount: 2 },
    { room: 'cash', postCount: 1 }
  ]
  const page = new TopicDiscoveryPage({ memoDb: makeMemoDb({ topics }) })

  const result = await page.load()

  assert.deepEqual(result.topics, topics)
})

test('load defaults to a page of 50 from offset 0', async () => {
  const memoDb = makeMemoDb({ topics: [] })
  const page = new TopicDiscoveryPage({ memoDb })

  await page.load()

  assert.deepEqual(memoDb.calls[0], { limit: 50, offset: 0 })
})

test('load forwards limit and offset and stores pagination', async () => {
  const memoDb = makeMemoDb({
    topics: [{ room: 'bitcoin', postCount: 2 }],
    pagination: { limit: 50, offset: 50, total: 60, hasMore: false }
  })
  const page = new TopicDiscoveryPage({ memoDb })

  const result = await page.load({ limit: 50, offset: 50 })

  assert.deepEqual(memoDb.calls[0], { limit: 50, offset: 50 })
  assert.deepEqual(result.pagination, { limit: 50, offset: 50, total: 60, hasMore: false })
  assert.equal(page.pagination.offset, 50)
})

test('canLoadMore reflects the pagination hasMore flag', async () => {
  const more = new TopicDiscoveryPage({
    memoDb: makeMemoDb({
      topics: [{ room: 'a', postCount: 0 }],
      pagination: { limit: 50, offset: 0, total: 60, hasMore: true }
    })
  })
  await more.load()
  assert.equal(more.canLoadMore(), true)

  const last = new TopicDiscoveryPage({
    memoDb: makeMemoDb({
      topics: [{ room: 'a', postCount: 0 }],
      pagination: { limit: 50, offset: 50, total: 60, hasMore: false }
    })
  })
  await last.load()
  assert.equal(last.canLoadMore(), false)
})

test('load throws when no memo db client is provided', async () => {
  const page = new TopicDiscoveryPage({})

  await assert.rejects(
    () => page.load(),
    /requires a memo db client/
  )
})

test('stores the provided navigate function', () => {
  const navigate = () => {}
  const page = new TopicDiscoveryPage({ memoDb: makeMemoDb({ topics: [] }), navigate })

  assert.equal(page.navigate, navigate)
})

test('getTopic returns the matching topic', async () => {
  const topics = [
    { room: 'bitcoin', postCount: 2 },
    { room: 'cash', postCount: 1 }
  ]
  const page = new TopicDiscoveryPage({ memoDb: makeMemoDb({ topics }) })

  await page.load()

  assert.deepEqual(page.getTopic('bitcoin'), { room: 'bitcoin', postCount: 2 })
})

test('getTopic returns null when the topic is not loaded', async () => {
  const page = new TopicDiscoveryPage({ memoDb: makeMemoDb({ topics: [] }) })

  await page.load()

  assert.equal(page.getTopic('bitcoin'), null)
})

test('getLastSeenLabel formats the topic last-seen time', async () => {
  const page = new TopicDiscoveryPage({
    memoDb: makeMemoDb({ topics: [{ room: 'bitcoin', postCount: 1, lastSeen: 1799998200000 }] })
  })

  await page.load()

  assert.equal(page.getLastSeenLabel('bitcoin', 1800000000000), 'Less than an hour ago')
})

test('getLastSeenLabel returns "No posts" for a topic with no posts', async () => {
  const page = new TopicDiscoveryPage({
    memoDb: makeMemoDb({ topics: [{ room: 'lone', postCount: 0, lastSeen: 0 }] })
  })

  await page.load()

  assert.equal(page.getLastSeenLabel('lone', 1800000000000), 'No posts')
})

test('getLastSeenLabel returns null for an unknown topic', async () => {
  const page = new TopicDiscoveryPage({ memoDb: makeMemoDb({ topics: [] }) })

  await page.load()

  assert.equal(page.getLastSeenLabel('missing', 1800000000000), null)
})

test('openTopic navigates to the encoded topic feed path', () => {
  const calls = []
  const page = new TopicDiscoveryPage({
    memoDb: makeMemoDb({ topics: [] }),
    navigate: (path) => calls.push(path)
  })

  const result = page.openTopic('space room')

  assert.deepEqual(result, { path: '/topics/space%20room' })
  assert.deepEqual(calls, ['/topics/space%20room'])
})

test('topicFeedPath percent-encodes the room name', () => {
  assert.equal(TopicDiscoveryPage.topicFeedPath('a/b'), '/topics/a%2Fb')
})

test('openTopic uses a no-op navigate by default', () => {
  const page = new TopicDiscoveryPage({ memoDb: makeMemoDb({ topics: [] }) })

  assert.deepEqual(page.openTopic('bitcoin'), { path: '/topics/bitcoin' })
})

test('exposes the topics page path', () => {
  assert.equal(TopicDiscoveryPage.TOPICS_PATH, '/topics')
})
