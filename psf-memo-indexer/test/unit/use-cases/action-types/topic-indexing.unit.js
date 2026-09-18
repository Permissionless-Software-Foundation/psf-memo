import { assert } from 'chai'
import { recordTopicPost, ensureTopicRoom, recordTopicFollow } from '../../../../src/use-cases/action-types/topic-indexing.js'
import { topicRecencyKey } from '../../../../src/use-cases/action-types/helpers.js'
import { makeMemoryDb } from '../../../support/memory-db.js'

function makeAdapters () {
  return {
    roomDb: makeMemoryDb(),
    topicSummaryDb: makeMemoryDb(),
    topicRecencyDb: makeMemoryDb()
  }
}

// These cover the defensive height fallbacks in recordTopicPost. The system
// always writes a numeric lastHeight, but a missing blockHeight or a legacy
// summary without lastHeight must still land at height zero.
describe('#recordTopicPost height fallbacks', () => {
  it('should treat a missing block height as height zero', async () => {
    const adapters = makeAdapters()

    await recordTopicPost(adapters, 'bitcoin', undefined)

    assert.deepEqual(adapters.topicSummaryDb.store.get('bitcoin'), {
      room: 'bitcoin',
      postCount: 1,
      lastHeight: 0,
      lastSeen: 0,
      followerCount: 0
    })
    assert.deepEqual(adapters.topicRecencyDb.store.get(topicRecencyKey(0, 'bitcoin')), {
      room: 'bitcoin',
      blockHeight: 0
    })
  })

  it('should delete the zero-height recency record when a legacy summary has no lastHeight', async () => {
    const adapters = makeAdapters()
    adapters.topicSummaryDb.store.set('bitcoin', { room: 'bitcoin', postCount: 2 })
    adapters.topicRecencyDb.store.set(topicRecencyKey(0, 'bitcoin'), { room: 'bitcoin', blockHeight: 0 })

    await recordTopicPost(adapters, 'bitcoin', 600100)

    assert.isFalse(adapters.topicRecencyDb.store.has(topicRecencyKey(0, 'bitcoin')))
    assert.deepEqual(adapters.topicRecencyDb.store.get(topicRecencyKey(600100, 'bitcoin')), {
      room: 'bitcoin',
      blockHeight: 600100
    })
    assert.deepEqual(adapters.topicSummaryDb.store.get('bitcoin'), {
      room: 'bitcoin',
      postCount: 3,
      lastHeight: 600100,
      lastSeen: 0,
      followerCount: 0
    })
  })

  it('should delete the stale recency record when the next height equals the legacy fallback', async () => {
    const adapters = makeAdapters()
    adapters.topicSummaryDb.store.set('bitcoin', { room: 'bitcoin', postCount: 2 })
    adapters.topicRecencyDb.store.set(topicRecencyKey(0, 'bitcoin'), { room: 'bitcoin', blockHeight: 0 })

    await recordTopicPost(adapters, 'bitcoin', 1)

    assert.isFalse(adapters.topicRecencyDb.store.has(topicRecencyKey(0, 'bitcoin')))
    assert.deepEqual(adapters.topicRecencyDb.store.get(topicRecencyKey(1, 'bitcoin')), {
      room: 'bitcoin',
      blockHeight: 1
    })
  })
})

describe('#recordTopicPost lastSeen', () => {
  it('should record the post seen time as lastSeen', async () => {
    const adapters = makeAdapters()

    await recordTopicPost(adapters, 'bitcoin', 600100, 1700000000000)

    assert.equal(adapters.topicSummaryDb.store.get('bitcoin').lastSeen, 1700000000000)
  })

  it('should keep the newest lastSeen when a later post has an earlier seen time', async () => {
    const adapters = makeAdapters()

    await recordTopicPost(adapters, 'bitcoin', 600200, 1700009999000)
    await recordTopicPost(adapters, 'bitcoin', 600100, 1700000000000)

    const summary = adapters.topicSummaryDb.store.get('bitcoin')
    assert.equal(summary.lastSeen, 1700009999000)
    assert.equal(summary.lastHeight, 600200)
    assert.equal(summary.postCount, 2)
  })

  it('should default lastSeen to zero when seen is missing', async () => {
    const adapters = makeAdapters()

    await recordTopicPost(adapters, 'bitcoin', 600100)

    assert.equal(adapters.topicSummaryDb.store.get('bitcoin').lastSeen, 0)
  })

  it('should preserve an existing followerCount when recording a post', async () => {
    const adapters = makeAdapters()
    adapters.topicSummaryDb.store.set('bitcoin', {
      room: 'bitcoin',
      postCount: 0,
      lastHeight: 0,
      lastSeen: 0,
      followerCount: 4
    })

    await recordTopicPost(adapters, 'bitcoin', 600100, 1700000000000)

    assert.equal(adapters.topicSummaryDb.store.get('bitcoin').followerCount, 4)
  })
})

describe('#ensureTopicRoom', () => {
  it('should return an existing summary unchanged', async () => {
    const adapters = makeAdapters()
    const existing = {
      room: 'bitcoin',
      postCount: 2,
      lastHeight: 600100,
      lastSeen: 1700000000000,
      followerCount: 3
    }
    adapters.topicSummaryDb.store.set('bitcoin', existing)

    const result = await ensureTopicRoom(adapters, 'bitcoin')

    assert.deepEqual(result, existing)
    assert.equal(adapters.topicRecencyDb.store.size, 0)
  })
})

describe('#recordTopicFollow legacy summaries', () => {
  it('should default a missing follower count to zero', async () => {
    const adapters = makeAdapters()
    adapters.topicSummaryDb.store.set('bitcoin', {
      room: 'bitcoin',
      postCount: 2,
      lastHeight: 600100,
      lastSeen: 1700000000000
    })

    await recordTopicFollow(adapters, {
      room: 'bitcoin',
      addr: 'bitcoincash:qaddr-a',
      unfollow: false,
      txid: 'follow-1',
      seen: 1,
      type: 'follow',
      blockHeight: 600100
    })

    assert.equal(adapters.topicSummaryDb.store.get('bitcoin').followerCount, 1)
  })
})
