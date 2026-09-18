import { assert } from 'chai'
import { handleTopicFollow } from '../../../../src/use-cases/action-types/topic-follow.js'
import { PREFIX_TOPIC_FOLLOW, PREFIX_TOPIC_UNFOLLOW } from '../../../../src/lib/memo-codes.js'
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
    async create (key, value) {
      store.set(key, value)
      return { success: true }
    },
    async update (key, value) {
      store.set(key, value)
      return { success: true }
    },
    async delete (key) {
      store.delete(key)
      return { success: true }
    }
  }
}

function makeAdapters () {
  return {
    roomDb: makeDb(),
    topicSummaryDb: makeDb(),
    topicRecencyDb: makeDb(),
    processErrorDb: makeDb()
  }
}

async function processFollow (adapters, { txid, room, addr, prefix = PREFIX_TOPIC_FOLLOW }) {
  await handleTopicFollow({
    adapters,
    txid,
    signerAddr: addr,
    seen: 1,
    blockHeight: 600000,
    decoded: {
      action: 'topic-follow',
      prefix,
      pushDatas: [prefix, Buffer.from(room, 'utf8')]
    }
  })
}

describe('#handleTopicFollow topic indexes', () => {
  it('should record a zero-post room with one follower for a follow-only room', async () => {
    const adapters = makeAdapters()

    await processFollow(adapters, { txid: 'follow-1', room: 'lone', addr: 'bitcoincash:qaddr-a' })

    assert.deepEqual(adapters.topicSummaryDb.store.get('lone'), {
      room: 'lone',
      postCount: 0,
      lastHeight: 0,
      lastSeen: 0,
      followerCount: 1
    })
    assert.deepEqual(adapters.topicRecencyDb.store.get(topicRecencyKey(0, 'lone')), {
      room: 'lone',
      blockHeight: 0
    })
  })

  it('should preserve post metadata and increase the follower count for an existing room', async () => {
    const adapters = makeAdapters()
    adapters.topicSummaryDb.store.set('bitcoin', {
      room: 'bitcoin',
      postCount: 1,
      lastHeight: 600400,
      lastSeen: 1700012345000,
      followerCount: 0
    })
    adapters.topicRecencyDb.store.set(topicRecencyKey(600400, 'bitcoin'), { room: 'bitcoin', blockHeight: 600400 })

    await processFollow(adapters, { txid: 'follow-2', room: 'bitcoin', addr: 'bitcoincash:qaddr-a' })

    assert.deepEqual(adapters.topicSummaryDb.store.get('bitcoin'), {
      room: 'bitcoin',
      postCount: 1,
      lastHeight: 600400,
      lastSeen: 1700012345000,
      followerCount: 1
    })
    assert.deepEqual(adapters.topicRecencyDb.store.get(topicRecencyKey(600400, 'bitcoin')), {
      room: 'bitcoin',
      blockHeight: 600400
    })
    assert.isFalse(adapters.topicRecencyDb.store.has(topicRecencyKey(0, 'bitcoin')))
  })

  it('should not create a zero-post room for an unfollow with no prior summary', async () => {
    const adapters = makeAdapters()

    await processFollow(adapters, {
      txid: 'unfollow-1',
      room: 'lone',
      addr: 'bitcoincash:qaddr-a',
      prefix: PREFIX_TOPIC_UNFOLLOW
    })

    assert.equal(adapters.topicSummaryDb.store.size, 0)
    assert.equal(adapters.topicRecencyDb.store.size, 0)
  })

  it('should count two distinct followers', async () => {
    const adapters = makeAdapters()

    await processFollow(adapters, { txid: 'follow-3', room: 'bitcoin', addr: 'bitcoincash:qaddr-a' })
    await processFollow(adapters, { txid: 'follow-4', room: 'bitcoin', addr: 'bitcoincash:qaddr-b' })

    assert.equal(adapters.topicSummaryDb.store.get('bitcoin').followerCount, 2)
  })

  it('should decrease the follower count on an unfollow', async () => {
    const adapters = makeAdapters()

    await processFollow(adapters, { txid: 'follow-5', room: 'bitcoin', addr: 'bitcoincash:qaddr-a' })
    await processFollow(adapters, { txid: 'follow-6', room: 'bitcoin', addr: 'bitcoincash:qaddr-b' })
    await processFollow(adapters, {
      txid: 'unfollow-2',
      room: 'bitcoin',
      addr: 'bitcoincash:qaddr-a',
      prefix: PREFIX_TOPIC_UNFOLLOW
    })

    assert.equal(adapters.topicSummaryDb.store.get('bitcoin').followerCount, 1)
  })

  it('should not change the follower count when a follow is reprocessed', async () => {
    const adapters = makeAdapters()

    await processFollow(adapters, { txid: 'follow-7', room: 'bitcoin', addr: 'bitcoincash:qaddr-a' })
    await processFollow(adapters, { txid: 'follow-7', room: 'bitcoin', addr: 'bitcoincash:qaddr-a' })

    assert.equal(adapters.topicSummaryDb.store.get('bitcoin').followerCount, 1)
  })

  it('should not double-decrement when an unfollow is reprocessed', async () => {
    const adapters = makeAdapters()

    await processFollow(adapters, { txid: 'follow-8', room: 'bitcoin', addr: 'bitcoincash:qaddr-a' })
    await processFollow(adapters, { txid: 'follow-9', room: 'bitcoin', addr: 'bitcoincash:qaddr-b' })
    const unfollow = {
      txid: 'unfollow-3',
      room: 'bitcoin',
      addr: 'bitcoincash:qaddr-a',
      prefix: PREFIX_TOPIC_UNFOLLOW
    }
    await processFollow(adapters, unfollow)
    await processFollow(adapters, unfollow)

    assert.equal(adapters.topicSummaryDb.store.get('bitcoin').followerCount, 1)
  })

  it('should let a re-follow increase the count after an unfollow', async () => {
    const adapters = makeAdapters()

    await processFollow(adapters, { txid: 'follow-10', room: 'bitcoin', addr: 'bitcoincash:qaddr-a' })
    await processFollow(adapters, {
      txid: 'unfollow-4',
      room: 'bitcoin',
      addr: 'bitcoincash:qaddr-a',
      prefix: PREFIX_TOPIC_UNFOLLOW
    })
    await processFollow(adapters, { txid: 'follow-11', room: 'bitcoin', addr: 'bitcoincash:qaddr-a' })

    assert.equal(adapters.topicSummaryDb.store.get('bitcoin').followerCount, 1)
  })

  it('should log a process error and write nothing when the push data count is invalid', async () => {
    const adapters = makeAdapters()

    await handleTopicFollow({
      adapters,
      txid: 'follow-bad',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 1,
      blockHeight: 600000,
      decoded: {
        action: 'topic-follow',
        prefix: PREFIX_TOPIC_FOLLOW,
        pushDatas: [PREFIX_TOPIC_FOLLOW]
      }
    })

    assert.equal(adapters.processErrorDb.store.size, 1)
    assert.equal(adapters.roomDb.store.size, 0)
    assert.equal(adapters.topicSummaryDb.store.size, 0)
    assert.equal(adapters.topicRecencyDb.store.size, 0)
  })
})
