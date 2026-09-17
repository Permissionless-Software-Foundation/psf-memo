import { assert } from 'chai'
import { backfillTopicIndexes, topicRecencyKey } from '../../../src/lib/backfill-topic-indexes.js'

function makeDb (records = []) {
  const store = new Map(records)
  return {
    store,
    async get (key) {
      if (!store.has(key)) {
        const err = new Error('not found')
        err.notFound = true
        throw err
      }
      return store.get(key)
    },
    async put (key, value) {
      store.set(key, value)
    },
    async del (key) {
      store.delete(key)
    },
    async * iterator () {
      for (const key of Array.from(store.keys()).sort()) {
        yield [key, store.get(key)]
      }
    }
  }
}

describe('#backfillTopicIndexes', () => {
  it('should summarize rooms with posts and follow-only rooms', async () => {
    const roomsDb = makeDb([
      ['bitcoin:post-100', { room: 'bitcoin', txid: 'post-100', type: 'post', blockHeight: 600100 }],
      ['bitcoin:post-200', { room: 'bitcoin', txid: 'post-200', type: 'post', blockHeight: 600200 }],
      ['bitcoin:addr-f', { room: 'bitcoin', addr: 'addr-f', type: 'follow', unfollow: false }],
      ['cash:post-250', { room: 'cash', txid: 'post-250', type: 'post', blockHeight: 600250 }],
      ['lone:addr-f', { room: 'lone', addr: 'addr-f', type: 'follow', unfollow: false }]
    ])
    const topicSummariesDb = makeDb()
    const topicRecencyDb = makeDb()

    const result = await backfillTopicIndexes({ roomsDb, topicSummariesDb, topicRecencyDb })

    assert.equal(result.rooms, 3)
    assert.deepEqual(topicSummariesDb.store.get('bitcoin'), { room: 'bitcoin', postCount: 2, lastHeight: 600200 })
    assert.deepEqual(topicSummariesDb.store.get('cash'), { room: 'cash', postCount: 1, lastHeight: 600250 })
    assert.deepEqual(topicSummariesDb.store.get('lone'), { room: 'lone', postCount: 0, lastHeight: 0 })

    assert.deepEqual(topicRecencyDb.store.get(topicRecencyKey(600200, 'bitcoin')), { room: 'bitcoin', blockHeight: 600200 })
    assert.deepEqual(topicRecencyDb.store.get(topicRecencyKey(600250, 'cash')), { room: 'cash', blockHeight: 600250 })
    assert.deepEqual(topicRecencyDb.store.get(topicRecencyKey(0, 'lone')), { room: 'lone', blockHeight: 0 })
    assert.equal(topicRecencyDb.store.size, 3)
  })

  it('should be idempotent across repeated runs', async () => {
    const roomsDb = makeDb([
      ['bitcoin:post-200', { room: 'bitcoin', txid: 'post-200', type: 'post', blockHeight: 600200 }],
      ['lone:addr-f', { room: 'lone', addr: 'addr-f', type: 'follow', unfollow: false }]
    ])
    const topicSummariesDb = makeDb()
    const topicRecencyDb = makeDb()

    await backfillTopicIndexes({ roomsDb, topicSummariesDb, topicRecencyDb })
    const firstSummaries = new Map(topicSummariesDb.store)
    const firstRecency = new Map(topicRecencyDb.store)

    await backfillTopicIndexes({ roomsDb, topicSummariesDb, topicRecencyDb })

    assert.deepEqual(topicSummariesDb.store, firstSummaries)
    assert.deepEqual(topicRecencyDb.store, firstRecency)
  })

  it('should remove stale recency records from a previous run', async () => {
    const roomsDb = makeDb([
      ['bitcoin:post-200', { room: 'bitcoin', txid: 'post-200', type: 'post', blockHeight: 600200 }]
    ])
    const topicSummariesDb = makeDb()
    const topicRecencyDb = makeDb([
      [topicRecencyKey(600100, 'bitcoin'), { room: 'bitcoin', blockHeight: 600100 }],
      [topicRecencyKey(0, 'stale'), { room: 'stale', blockHeight: 0 }]
    ])

    await backfillTopicIndexes({ roomsDb, topicSummariesDb, topicRecencyDb })

    assert.isFalse(topicRecencyDb.store.has(topicRecencyKey(600100, 'bitcoin')))
    assert.isFalse(topicRecencyDb.store.has(topicRecencyKey(0, 'stale')))
    assert.isTrue(topicRecencyDb.store.has(topicRecencyKey(600200, 'bitcoin')))
  })
})
