import { assert } from 'chai'
import { handleTopicMessage } from '../../../../src/use-cases/action-types/topic-message.js'
import { topicRecencyKey } from '../../../../src/use-cases/action-types/helpers.js'
import { MAX_POST_SIZE } from '../../../../src/lib/memo-codes.js'

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
    },
    entries () {
      return Array.from(store.entries())
    }
  }
}

function makeAdapters () {
  return {
    postDb: makeDb(),
    postHeightDb: makeDb(),
    addrPostHeightDb: makeDb(),
    roomDb: makeDb(),
    topicSummaryDb: makeDb(),
    topicRecencyDb: makeDb(),
    processErrorDb: makeDb()
  }
}

async function processTopicMessage (adapters, { txid, room, addr, height, text }) {
  const prefix = Buffer.from('6d0c', 'hex')
  await handleTopicMessage({
    adapters,
    txid,
    signerAddr: addr,
    seen: 1,
    blockHeight: height,
    decoded: {
      action: 'topic-message',
      prefix,
      pushDatas: [prefix, Buffer.from(room, 'utf8'), Buffer.from(text, 'utf8')]
    }
  })
}

describe('#handleTopicMessage topic indexes', () => {
  it('should record a room summary and a recency record', async () => {
    const adapters = makeAdapters()

    await processTopicMessage(adapters, {
      txid: 'topic-a1',
      room: 'bitcoin',
      addr: 'bitcoincash:qaddr-a',
      height: 600100,
      text: 'hello'
    })

    assert.deepEqual(adapters.topicSummaryDb.store.get('bitcoin'), {
      room: 'bitcoin',
      postCount: 1,
      lastHeight: 600100
    })
    assert.deepEqual(adapters.topicRecencyDb.store.get(topicRecencyKey(600100, 'bitcoin')), {
      room: 'bitcoin',
      blockHeight: 600100
    })
  })

  it('should accumulate postCount and keep the newest height', async () => {
    const adapters = makeAdapters()

    await processTopicMessage(adapters, { txid: 'topic-a1', room: 'bitcoin', addr: 'bitcoincash:qaddr-a', height: 600100, text: 'hello' })
    await processTopicMessage(adapters, { txid: 'topic-a2', room: 'bitcoin', addr: 'bitcoincash:qaddr-a', height: 600200, text: 'again' })

    assert.deepEqual(adapters.topicSummaryDb.store.get('bitcoin'), {
      room: 'bitcoin',
      postCount: 2,
      lastHeight: 600200
    })
    assert.deepEqual(adapters.topicRecencyDb.store.get(topicRecencyKey(600200, 'bitcoin')), {
      room: 'bitcoin',
      blockHeight: 600200
    })
    assert.equal(adapters.topicRecencyDb.store.size, 1)
  })

  it('should keep the newest height when a later message has an earlier height', async () => {
    const adapters = makeAdapters()

    await processTopicMessage(adapters, { txid: 'topic-a3', room: 'bitcoin', addr: 'bitcoincash:qaddr-a', height: 600200, text: 'later' })
    await processTopicMessage(adapters, { txid: 'topic-a4', room: 'bitcoin', addr: 'bitcoincash:qaddr-a', height: 600100, text: 'earlier' })

    assert.deepEqual(adapters.topicSummaryDb.store.get('bitcoin'), {
      room: 'bitcoin',
      postCount: 2,
      lastHeight: 600200
    })
    assert.deepEqual(adapters.topicRecencyDb.store.get(topicRecencyKey(600200, 'bitcoin')), {
      room: 'bitcoin',
      blockHeight: 600200
    })
    assert.equal(adapters.topicRecencyDb.store.size, 1)
  })

  it('should not double-count a reprocessed topic message', async () => {
    const adapters = makeAdapters()

    await processTopicMessage(adapters, { txid: 'topic-c1', room: 'bitcoin', addr: 'bitcoincash:qaddr-c', height: 600300, text: 'repeated' })
    await processTopicMessage(adapters, { txid: 'topic-c1', room: 'bitcoin', addr: 'bitcoincash:qaddr-c', height: 600300, text: 'repeated' })

    assert.deepEqual(adapters.topicSummaryDb.store.get('bitcoin'), {
      room: 'bitcoin',
      postCount: 1,
      lastHeight: 600300
    })
    assert.equal(adapters.topicRecencyDb.store.size, 1)
  })

  it('should log a process error and index nothing for an invalid push data count', async () => {
    const adapters = makeAdapters()
    const prefix = Buffer.from('6d0c', 'hex')

    await handleTopicMessage({
      adapters,
      txid: 'topic-bad',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 1,
      blockHeight: 600100,
      decoded: {
        action: 'topic-message',
        prefix,
        pushDatas: [prefix, Buffer.from('bitcoin', 'utf8')]
      }
    })

    assert.equal(adapters.processErrorDb.store.size, 1)
    assert.equal(adapters.topicSummaryDb.store.size, 0)
    assert.equal(adapters.topicRecencyDb.store.size, 0)
  })

  it('should index a topic message with room and message exactly at the maximum size', async () => {
    const adapters = makeAdapters()
    const room = 'bitcoin'
    const message = 'x'.repeat(MAX_POST_SIZE - room.length)

    await processTopicMessage(adapters, {
      txid: 'topic-max',
      room,
      addr: 'bitcoincash:qaddr-a',
      height: 600100,
      text: message
    })

    assert.equal(adapters.processErrorDb.store.size, 0)
    assert.deepEqual(adapters.topicSummaryDb.store.get(room), {
      room,
      postCount: 1,
      lastHeight: 600100
    })
  })

  it('should log a process error and index nothing for an oversized topic message', async () => {
    const adapters = makeAdapters()
    const prefix = Buffer.from('6d0c', 'hex')

    await handleTopicMessage({
      adapters,
      txid: 'topic-big',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 1,
      blockHeight: 600100,
      decoded: {
        action: 'topic-message',
        prefix,
        pushDatas: [prefix, Buffer.from('bitcoin', 'utf8'), Buffer.from('x'.repeat(65000), 'utf8')]
      }
    })

    assert.equal(adapters.processErrorDb.store.size, 1)
    assert.equal(adapters.topicSummaryDb.store.size, 0)
    assert.equal(adapters.topicRecencyDb.store.size, 0)
  })
})
