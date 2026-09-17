import { assert } from 'chai'
import { recordTopicPost } from '../../../../src/use-cases/action-types/topic-indexing.js'
import { topicRecencyKey } from '../../../../src/use-cases/action-types/helpers.js'

function makeDb () {
  const store = new Map()
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
    async update (key, value) {
      store.set(key, value)
    },
    async delete (key) {
      store.delete(key)
    }
  }
}

function makeAdapters () {
  return {
    topicSummaryDb: makeDb(),
    topicRecencyDb: makeDb()
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
      lastHeight: 0
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
      lastHeight: 600100
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
