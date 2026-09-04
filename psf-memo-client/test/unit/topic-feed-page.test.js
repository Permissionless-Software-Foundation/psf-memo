/*
  Unit tests for the topic feed page controller.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const TopicFeedPage = require('../../src/services/topic-feed-page')

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

function makeMemoDb (posts, pagination, { following = false, followers = [] } = {}) {
  return {
    async getTopicPosts (room, { limit, offset }) {
      return { posts, pagination }
    },
    async getTopicFollowState (room, addr) {
      return following
    },
    async getTopicFollowers (room) {
      return followers
    }
  }
}

function makeMemoTopicFollow () {
  return {
    broadcasts: [],
    async follow (room) {
      this.broadcasts.push({ action: 'follow', room })
      return 'aa'.repeat(32)
    },
    async unfollow (room) {
      this.broadcasts.push({ action: 'unfollow', room })
      return 'bb'.repeat(32)
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
    },
    async getTopicFollowState () {
      return false
    },
    async getTopicFollowers () {
      return []
    }
  }
  const page = new TopicFeedPage({ memoDb, room: 'bitcoin' })

  await page.load({ limit: 10, offset: 20 })

  assert.deepEqual(calls, [{ room: 'bitcoin', params: { limit: 10, offset: 20 } }])
})

test('load defaults limit and offset to 50 and 0', async () => {
  const calls = []
  const memoDb = {
    async getTopicPosts (room, params) {
      calls.push(params)
      return { posts: [], pagination: {} }
    },
    async getTopicFollowState () {
      return false
    },
    async getTopicFollowers () {
      return []
    }
  }
  const page = new TopicFeedPage({ memoDb, room: 'bitcoin' })

  await page.load()

  assert.deepEqual(calls, [{ limit: 50, offset: 0 }])
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

test('starts not following and with no followers', () => {
  const page = new TopicFeedPage({ room: 'bitcoin' })

  assert.equal(page.followState, false)
  assert.deepEqual(page.followers, [])
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

test('load fetches follow state when myAddr is provided', async () => {
  const page = new TopicFeedPage({
    memoDb: makeMemoDb([], {}, { following: true }),
    room: 'bitcoin',
    myAddr: MY_ADDRESS
  })

  const result = await page.load()

  assert.equal(result.followState, true)
  assert.equal(page.isFollowing(), true)
})

test('load returns following=false when no myAddr is provided', async () => {
  const page = new TopicFeedPage({ memoDb: makeMemoDb([], {}), room: 'bitcoin' })

  const result = await page.load()

  assert.equal(result.followState, false)
})

test('load fetches followers list', async () => {
  const followers = ['bitcoincash:a', 'bitcoincash:b']
  const page = new TopicFeedPage({
    memoDb: makeMemoDb([], {}, { followers }),
    room: 'bitcoin'
  })

  const result = await page.load()

  assert.deepEqual(result.followers, followers)
})

test('follow broadcasts and updates local state', async () => {
  const memoTopicFollow = makeMemoTopicFollow()
  const page = new TopicFeedPage({
    memoDb: makeMemoDb([], {}),
    room: 'bitcoin',
    myAddr: MY_ADDRESS,
    memoTopicFollow
  })

  const result = await page.follow()

  assert.equal(result.ok, true)
  assert.equal(page.isFollowing(), true)
  assert.deepEqual(memoTopicFollow.broadcasts, [{ action: 'follow', room: 'bitcoin' }])
  assert.ok(page.followers.includes(MY_ADDRESS))
})

test('unfollow broadcasts and updates local state', async () => {
  const memoTopicFollow = makeMemoTopicFollow()
  const page = new TopicFeedPage({
    memoDb: makeMemoDb([], {}),
    room: 'bitcoin',
    myAddr: MY_ADDRESS,
    memoTopicFollow
  })

  const result = await page.unfollow()

  assert.equal(result.ok, true)
  assert.equal(page.isFollowing(), false)
  assert.deepEqual(memoTopicFollow.broadcasts, [{ action: 'unfollow', room: 'bitcoin' }])
  assert.ok(!page.followers.includes(MY_ADDRESS))
})

test('follow requires a memo topic follow handler', async () => {
  const page = new TopicFeedPage({
    memoDb: makeMemoDb([], {}),
    room: 'bitcoin',
    myAddr: MY_ADDRESS
  })

  await assert.rejects(
    () => page.follow(),
    /requires a memo topic follow handler/
  )
})

test('exposes the topic feed path for a room', () => {
  assert.equal(TopicFeedPage.topicFeedPath('bitcoin'), '/topics/bitcoin')
})

test('canLoadMore reflects pagination.hasMore', async () => {
  const more = new TopicFeedPage({ memoDb: makeMemoDb([], { hasMore: true }), room: 'bitcoin' })
  await more.load()
  assert.equal(more.canLoadMore(), true)

  const done = new TopicFeedPage({ memoDb: makeMemoDb([], { hasMore: false }), room: 'bitcoin' })
  await done.load()
  assert.equal(done.canLoadMore(), false)
})

test('canLoadMore returns false when pagination is null or missing hasMore', async () => {
  const pageNull = new TopicFeedPage({ memoDb: makeMemoDb([], null), room: 'bitcoin' })
  await pageNull.load()
  assert.equal(pageNull.canLoadMore(), false)

  const pageEmpty = new TopicFeedPage({ memoDb: makeMemoDb([], { total: 0 }), room: 'bitcoin' })
  await pageEmpty.load()
  assert.equal(pageEmpty.canLoadMore(), false)
})
