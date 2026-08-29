/*
  Unit tests for the add-poll-option indexer handler.
*/

import { assert } from 'chai'
import { handleAddPollOption } from '../../../../src/use-cases/action-types/poll-option.js'

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
    pollOptionDb: makeDb(),
    processErrorDb: makeDb()
  }
}

const POLL_TXID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

describe('handleAddPollOption', () => {
  it('should store an option for a poll', async () => {
    const adapters = makeAdapters()
    const prefix = Buffer.from('6d13', 'hex')

    const result = await handleAddPollOption({
      adapters,
      txid: 'txid-1',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 1,
      blockHeight: 100,
      decoded: {
        action: 'addPollOption',
        prefix,
        pushDatas: [prefix, Buffer.from(POLL_TXID, 'hex').reverse(), Buffer.from('yes', 'utf8')]
      }
    })

    assert.isTrue(result)
    const option = await adapters.pollOptionDb.get('txid-1')
    assert.equal(option.option, 'yes')
    assert.equal(option.pollTxid, POLL_TXID)
  })

  it('should reject an empty option and log an error', async () => {
    const adapters = makeAdapters()
    const prefix = Buffer.from('6d13', 'hex')

    const result = await handleAddPollOption({
      adapters,
      txid: 'txid-1',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 1,
      blockHeight: 100,
      decoded: {
        action: 'addPollOption',
        prefix,
        pushDatas: [prefix, Buffer.from(POLL_TXID, 'hex').reverse(), Buffer.from('', 'utf8')]
      }
    })

    assert.isFalse(result)
    try {
      await adapters.pollOptionDb.get('txid-1')
      assert.fail('expected option to not be stored')
    } catch (err) {
      assert.isTrue(err.notFound)
    }
    const errors = adapters.processErrorDb.entries()
    assert.isAbove(errors.length, 0)
  })

  it('should reject a poll tx hash with the wrong size', async () => {
    const adapters = makeAdapters()
    const prefix = Buffer.from('6d13', 'hex')

    const result = await handleAddPollOption({
      adapters,
      txid: 'txid-1',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 1,
      blockHeight: 100,
      decoded: {
        action: 'addPollOption',
        prefix,
        pushDatas: [prefix, Buffer.from('1234', 'hex'), Buffer.from('yes', 'utf8')]
      }
    })

    assert.isFalse(result)
    const errors = adapters.processErrorDb.entries()
    assert.isAbove(errors.length, 0)
  })

  it('should reject a wrong push data count', async () => {
    const adapters = makeAdapters()
    const prefix = Buffer.from('6d13', 'hex')

    const result = await handleAddPollOption({
      adapters,
      txid: 'txid-1',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 1,
      blockHeight: 100,
      decoded: {
        action: 'addPollOption',
        prefix,
        pushDatas: [prefix, Buffer.from('yes', 'utf8')]
      }
    })

    assert.isFalse(result)
    const errors = adapters.processErrorDb.entries()
    assert.isAbove(errors.length, 0)
  })
})
