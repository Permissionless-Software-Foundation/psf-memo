import { assert } from 'chai'
import { backfillTopicIndexes, topicRecencyKey } from '../../../src/lib/backfill-topic-indexes.js'
import { FakeDb } from '../../support/level-double.js'

describe('#backfillTopicIndexes', () => {
  it('should summarize rooms with posts and follow-only rooms', async () => {
    const roomsDb = new FakeDb([
      ['bitcoin:post-100', { room: 'bitcoin', txid: 'post-100', type: 'post', blockHeight: 600100, seen: 1700000000000 }],
      ['bitcoin:post-200', { room: 'bitcoin', txid: 'post-200', type: 'post', blockHeight: 600200, seen: 1700000999000 }],
      ['bitcoin:addr-f', { room: 'bitcoin', addr: 'addr-f', type: 'follow', unfollow: false }],
      ['cash:post-250', { room: 'cash', txid: 'post-250', type: 'post', blockHeight: 600250, seen: 1700002000000 }],
      ['lone:addr-f', { room: 'lone', addr: 'addr-f', type: 'follow', unfollow: false }]
    ])
    const topicSummariesDb = new FakeDb()
    const topicRecencyDb = new FakeDb()

    const result = await backfillTopicIndexes({ roomsDb, topicSummariesDb, topicRecencyDb })

    assert.equal(result.rooms, 3)
    assert.deepEqual(topicSummariesDb.store.get('bitcoin'), {
      room: 'bitcoin',
      postCount: 2,
      lastHeight: 600200,
      lastSeen: 1700000999000,
      followerCount: 1
    })
    assert.deepEqual(topicSummariesDb.store.get('cash'), {
      room: 'cash',
      postCount: 1,
      lastHeight: 600250,
      lastSeen: 1700002000000,
      followerCount: 0
    })
    assert.deepEqual(topicSummariesDb.store.get('lone'), {
      room: 'lone',
      postCount: 0,
      lastHeight: 0,
      lastSeen: 0,
      followerCount: 1
    })

    assert.deepEqual(topicRecencyDb.store.get(topicRecencyKey(600200, 'bitcoin')), { room: 'bitcoin', blockHeight: 600200 })
    assert.deepEqual(topicRecencyDb.store.get(topicRecencyKey(600250, 'cash')), { room: 'cash', blockHeight: 600250 })
    assert.deepEqual(topicRecencyDb.store.get(topicRecencyKey(0, 'lone')), { room: 'lone', blockHeight: 0 })
    assert.equal(topicRecencyDb.store.size, 3)
  })

  it('should count only active follows and ignore unfollowed addresses', async () => {
    const roomsDb = new FakeDb([
      ['bitcoin:addr-a', { room: 'bitcoin', addr: 'addr-a', type: 'follow', unfollow: false }],
      ['bitcoin:addr-b', { room: 'bitcoin', addr: 'addr-b', type: 'follow', unfollow: true }],
      ['bitcoin:addr-c', { room: 'bitcoin', addr: 'addr-c', type: 'follow', unfollow: false }]
    ])
    const topicSummariesDb = new FakeDb()
    const topicRecencyDb = new FakeDb()

    await backfillTopicIndexes({ roomsDb, topicSummariesDb, topicRecencyDb })

    assert.equal(topicSummariesDb.store.get('bitcoin').followerCount, 2)
  })

  it('should keep the newest lastSeen when post heights and seen times disagree', async () => {
    const roomsDb = new FakeDb([
      ['bitcoin:post-100', { room: 'bitcoin', txid: 'post-100', type: 'post', blockHeight: 600100, seen: 1700009999000 }],
      ['bitcoin:post-200', { room: 'bitcoin', txid: 'post-200', type: 'post', blockHeight: 600200, seen: 1700000000000 }]
    ])
    const topicSummariesDb = new FakeDb()
    const topicRecencyDb = new FakeDb()

    await backfillTopicIndexes({ roomsDb, topicSummariesDb, topicRecencyDb })

    const summary = topicSummariesDb.store.get('bitcoin')
    assert.equal(summary.lastHeight, 600200)
    assert.equal(summary.lastSeen, 1700009999000)
  })

  it('should be idempotent across repeated runs', async () => {
    const roomsDb = new FakeDb([
      ['bitcoin:post-200', { room: 'bitcoin', txid: 'post-200', type: 'post', blockHeight: 600200, seen: 1700003000000 }],
      ['lone:addr-f', { room: 'lone', addr: 'addr-f', type: 'follow', unfollow: false }]
    ])
    const topicSummariesDb = new FakeDb()
    const topicRecencyDb = new FakeDb()

    await backfillTopicIndexes({ roomsDb, topicSummariesDb, topicRecencyDb })
    const firstSummaries = new Map(topicSummariesDb.store)
    const firstRecency = new Map(topicRecencyDb.store)

    await backfillTopicIndexes({ roomsDb, topicSummariesDb, topicRecencyDb })

    assert.deepEqual(topicSummariesDb.store, firstSummaries)
    assert.deepEqual(topicRecencyDb.store, firstRecency)
  })

  it('should remove stale recency records from a previous run', async () => {
    const roomsDb = new FakeDb([
      ['bitcoin:post-200', { room: 'bitcoin', txid: 'post-200', type: 'post', blockHeight: 600200, seen: 1700000000000 }]
    ])
    const topicSummariesDb = new FakeDb()
    const topicRecencyDb = new FakeDb([
      [topicRecencyKey(600100, 'bitcoin'), { room: 'bitcoin', blockHeight: 600100 }],
      [topicRecencyKey(0, 'stale'), { room: 'stale', blockHeight: 0 }]
    ])

    await backfillTopicIndexes({ roomsDb, topicSummariesDb, topicRecencyDb })

    assert.isFalse(topicRecencyDb.store.has(topicRecencyKey(600100, 'bitcoin')))
    assert.isFalse(topicRecencyDb.store.has(topicRecencyKey(0, 'stale')))
    assert.isTrue(topicRecencyDb.store.has(topicRecencyKey(600200, 'bitcoin')))
  })

  it('should fall back to the key room segment when a record omits the room', async () => {
    const roomsDb = new FakeDb([
      ['cash:post-1', { type: 'post', blockHeight: 500 }]
    ])
    const topicSummariesDb = new FakeDb()
    const topicRecencyDb = new FakeDb()

    await backfillTopicIndexes({ roomsDb, topicSummariesDb, topicRecencyDb })

    assert.deepEqual(topicSummariesDb.store.get('cash'), {
      room: 'cash',
      postCount: 1,
      lastHeight: 500,
      lastSeen: 0,
      followerCount: 0
    })
    assert.deepEqual(topicRecencyDb.store.get(topicRecencyKey(500, 'cash')), { room: 'cash', blockHeight: 500 })
  })

  it('should default a missing post block height to zero', async () => {
    const roomsDb = new FakeDb([
      ['bitcoin:post-1', { room: 'bitcoin', txid: 'post-1', type: 'post', seen: 1700000000000 }]
    ])
    const topicSummariesDb = new FakeDb()
    const topicRecencyDb = new FakeDb()

    await backfillTopicIndexes({ roomsDb, topicSummariesDb, topicRecencyDb })

    assert.equal(topicSummariesDb.store.get('bitcoin').lastHeight, 0)
    assert.deepEqual(topicRecencyDb.store.get(topicRecencyKey(0, 'bitcoin')), { room: 'bitcoin', blockHeight: 0 })
  })
})

describe('#topicRecencyKey', () => {
  it('should treat a missing or null height as height zero', () => {
    assert.equal(topicRecencyKey(undefined, 'bitcoin'), topicRecencyKey(0, 'bitcoin'))
    assert.equal(topicRecencyKey(null, 'bitcoin'), topicRecencyKey(0, 'bitcoin'))
  })
})
