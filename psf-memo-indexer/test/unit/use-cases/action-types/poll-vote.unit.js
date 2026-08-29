/*
  Unit tests for the poll-vote indexer handler.
*/

import { assert } from 'chai'
import { handlePollVote } from '../../../../src/use-cases/action-types/poll-vote.js'

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
    pollVoteDb: makeDb(),
    processErrorDb: makeDb()
  }
}

const POLL_TXID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

describe('handlePollVote', () => {
  it('should store a vote for a poll', async () => {
    const adapters = makeAdapters()
    const prefix = Buffer.from('6d14', 'hex')

    await handlePollVote({
      adapters,
      txid: 'txid-1',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 1,
      blockHeight: 100,
      decoded: {
        action: 'pollVote',
        prefix,
        pushDatas: [prefix, Buffer.from(POLL_TXID, 'hex').reverse(), Buffer.from('yes', 'utf8')]
      }
    })

    const vote = await adapters.pollVoteDb.get('txid-1')
    assert.equal(vote.comment, 'yes')
    assert.equal(vote.pollTxid, POLL_TXID)
  })

  it('should reject an empty comment and log an error', async () => {
    const adapters = makeAdapters()
    const prefix = Buffer.from('6d14', 'hex')

    await handlePollVote({
      adapters,
      txid: 'txid-1',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 1,
      blockHeight: 100,
      decoded: {
        action: 'pollVote',
        prefix,
        pushDatas: [prefix, Buffer.from(POLL_TXID, 'hex').reverse(), Buffer.from('', 'utf8')]
      }
    })

    try {
      await adapters.pollVoteDb.get('txid-1')
      assert.fail('expected vote to not be stored')
    } catch (err) {
      assert.isTrue(err.notFound)
    }
    const errors = adapters.processErrorDb.entries()
    assert.isAbove(errors.length, 0)
  })

  it('should reject a poll tx hash with the wrong size', async () => {
    const adapters = makeAdapters()
    const prefix = Buffer.from('6d14', 'hex')

    await handlePollVote({
      adapters,
      txid: 'txid-1',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 1,
      blockHeight: 100,
      decoded: {
        action: 'pollVote',
        prefix,
        pushDatas: [prefix, Buffer.from('1234', 'hex'), Buffer.from('yes', 'utf8')]
      }
    })

    const errors = adapters.processErrorDb.entries()
    assert.isAbove(errors.length, 0)
  })
})
