/*
  Unit tests for the create-poll indexer handler.
*/

import { assert } from 'chai'
import { handleCreatePoll, normalizePollCreateDatas } from '../../../../src/use-cases/action-types/poll-create.js'

function makeDb () {
  const store = new Map()
  return {
    async get (key) {
      if (!store.has(key)) {
        const err = new Error('not found')
        err.notFound = true
        throw err
      }
      return store.get(key)
    },
    async create (key, data) {
      store.set(key, data)
      return { success: true }
    },
    entries () {
      return Array.from(store.entries())
    }
  }
}

function makeAdapters () {
  return {
    pollDb: makeDb(),
    postHeightDb: makeDb(),
    addrPostHeightDb: makeDb(),
    processErrorDb: makeDb()
  }
}

describe('handleCreatePoll', () => {
  it('should store a poll with question and option count', async () => {
    const adapters = makeAdapters()
    const prefix = Buffer.from('6d10', 'hex')
    const question = 'which is better?'

    await handleCreatePoll({
      adapters,
      txid: 'txid-1',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 1,
      blockHeight: 100,
      decoded: {
        action: 'createPoll',
        prefix,
        pushDatas: [prefix, Buffer.from([1]), Buffer.from([2]), Buffer.from(question, 'utf8')]
      }
    })

    const poll = await adapters.pollDb.get('txid-1')
    assert.equal(poll.question, question)
    assert.equal(poll.optionCount, 2)
    assert.equal(poll.pollType, 1)
  })

  it('should accept a combined prefix+payload push', async () => {
    const adapters = makeAdapters()
    const prefix = Buffer.from('6d10', 'hex')
    const question = 'which is better?'
    const combined = Buffer.concat([Buffer.from([1]), Buffer.from([2]), Buffer.from(question, 'utf8')])

    await handleCreatePoll({
      adapters,
      txid: 'txid-1',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 1,
      blockHeight: 100,
      decoded: {
        action: 'createPoll',
        prefix,
        pushDatas: [prefix, combined]
      }
    })

    const poll = await adapters.pollDb.get('txid-1')
    assert.equal(poll.question, question)
    assert.equal(poll.optionCount, 2)
  })

  it('should reject an empty question and log an error', async () => {
    const adapters = makeAdapters()
    const prefix = Buffer.from('6d10', 'hex')

    await handleCreatePoll({
      adapters,
      txid: 'txid-1',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 1,
      blockHeight: 100,
      decoded: {
        action: 'createPoll',
        prefix,
        pushDatas: [prefix, Buffer.from([1]), Buffer.from([2]), Buffer.from('', 'utf8')]
      }
    })

    try {
      await adapters.pollDb.get('txid-1')
      assert.fail('expected poll to not be stored')
    } catch (err) {
      assert.isTrue(err.notFound)
    }
    const errors = adapters.processErrorDb.entries()
    assert.isAbove(errors.length, 0)
  })

  it('should reject malformed push data count and log an error', async () => {
    const adapters = makeAdapters()
    const prefix = Buffer.from('6d10', 'hex')

    await handleCreatePoll({
      adapters,
      txid: 'txid-1',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 1,
      blockHeight: 100,
      decoded: {
        action: 'createPoll',
        prefix,
        pushDatas: [prefix]
      }
    })

    const errors = adapters.processErrorDb.entries()
    assert.isAbove(errors.length, 0)
  })
})

describe('normalizePollCreateDatas', () => {
  it('should normalize separate pushes', () => {
    const result = normalizePollCreateDatas([
      Buffer.from('6d10', 'hex'),
      Buffer.from([1]),
      Buffer.from([2]),
      Buffer.from('hello', 'utf8')
    ])
    assert.isTrue(result.ok)
    assert.equal(result.pollType, 1)
    assert.equal(result.optionCount, 2)
    assert.equal(result.question, 'hello')
  })

  it('should normalize a combined push', () => {
    const result = normalizePollCreateDatas([
      Buffer.from('6d10', 'hex'),
      Buffer.concat([Buffer.from([1]), Buffer.from([2]), Buffer.from('hello', 'utf8')])
    ])
    assert.isTrue(result.ok)
    assert.equal(result.question, 'hello')
  })

  it('should reject a null push data list', () => {
    const result = normalizePollCreateDatas(null)
    assert.isFalse(result.ok)
  })

  it('should report a zero push count for an empty list', () => {
    const result = normalizePollCreateDatas([])
    assert.isFalse(result.ok)
    assert.match(result.error, /count 0/)
  })

  it('should report the actual push count for a short list', () => {
    const result = normalizePollCreateDatas([Buffer.from('6d10', 'hex')])
    assert.isFalse(result.ok)
    assert.match(result.error, /count 1/)
  })

  it('should accept a combined push of exactly two bytes', () => {
    const result = normalizePollCreateDatas([
      Buffer.from('6d10', 'hex'),
      Buffer.from([1, 2])
    ])
    assert.isTrue(result.ok)
    assert.equal(result.pollType, 1)
    assert.equal(result.optionCount, 2)
  })

  it('should reject a combined push that is too short', () => {
    const result = normalizePollCreateDatas([
      Buffer.from('6d10', 'hex'),
      Buffer.from([1])
    ])
    assert.isFalse(result.ok)
  })

  it('should reject a three-push payload', () => {
    const result = normalizePollCreateDatas([
      Buffer.from('6d10', 'hex'),
      Buffer.from([1]),
      Buffer.from([2])
    ])
    assert.isFalse(result.ok)
  })
})
