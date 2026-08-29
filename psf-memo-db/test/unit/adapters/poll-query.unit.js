/*
  Unit tests for the PollQuery adapter.
*/

import { assert } from 'chai'
import PollQuery from '../../../src/adapters/poll-query.js'

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
    async put (key, value) {
      store.set(key, value)
    },
    iterator () {
      const entries = Array.from(store.entries())
      let i = 0
      return {
        [Symbol.asyncIterator] () {
          return this
        },
        async next () {
          if (i >= entries.length) return { done: true }
          const entry = entries[i++]
          return { value: entry, done: false }
        }
      }
    }
  }
}

describe('PollQuery', () => {
  let pollsDb, pollOptionsDb, pollVotesDb, query

  beforeEach(() => {
    pollsDb = makeDb()
    pollOptionsDb = makeDb()
    pollVotesDb = makeDb()
    query = new PollQuery({ pollsDb, pollOptionsDb, pollVotesDb })
  })

  it('should return null when the poll does not exist', async () => {
    const result = await query.getPoll('missing')
    assert.isNull(result)
  })

  it('should return a poll with its options and votes', async () => {
    await pollsDb.put('poll-1', { question: 'which?', optionCount: 2, pollType: 1 })
    await pollOptionsDb.put('opt-1', { pollTxid: 'poll-1', option: 'yes' })
    await pollVotesDb.put('vote-1', { pollTxid: 'poll-1', comment: 'yes' })

    const result = await query.getPoll('poll-1')

    assert.equal(result.question, 'which?')
    assert.equal(result.options.length, 1)
    assert.equal(result.options[0].option, 'yes')
    assert.equal(result.votes.length, 1)
    assert.equal(result.votes[0].comment, 'yes')
  })

  it('should only return options and votes for the requested poll', async () => {
    await pollsDb.put('poll-1', { question: 'which?', optionCount: 2, pollType: 1 })
    await pollOptionsDb.put('opt-1', { pollTxid: 'poll-1', option: 'yes' })
    await pollOptionsDb.put('opt-2', { pollTxid: 'poll-2', option: 'no' })
    await pollVotesDb.put('vote-1', { pollTxid: 'poll-1', comment: 'yes' })
    await pollVotesDb.put('vote-2', { pollTxid: 'poll-2', comment: 'no' })

    const result = await query.getPoll('poll-1')

    assert.equal(result.options.length, 1)
    assert.equal(result.votes.length, 1)
  })
})
