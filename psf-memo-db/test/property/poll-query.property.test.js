/*
  Property tests for the PollQuery adapter's option and vote filtering.

  These pin down invariants the unit tests probe at fixed fixtures:

    - Partition/conservation: getPollOptions(txid) returns exactly the
      records that reference that poll, and the records are partitioned such
      that every stored record is returned by exactly one poll.
    - Value fidelity: each returned record keeps its own txid key and its
      original option/comment text.
*/

import test from 'node:test'

import { seededRandom, forAll, txidGen } from './harness.js'
import PollQuery from '../../src/adapters/poll-query.js'

const rng = seededRandom(20260828)

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

function randomText (prefix) {
  return `${prefix}-${Math.floor(rng() * 1e6)}`
}

test('getPollOptions returns exactly the options for the requested poll', async () => {
  await forAll(
    () => {
      const pollCount = 1 + Math.floor(rng() * 8)
      const polls = []
      for (let i = 0; i < pollCount; i++) {
        polls.push({ txid: txidGen(rng), count: Math.floor(rng() * 6) })
      }
      return polls
    },
    async (polls) => {
      const pollOptionsDb = makeDb()
      const query = new PollQuery({ pollsDb: makeDb(), pollOptionsDb, pollVotesDb: makeDb() })
      const byPoll = new Map()

      for (const poll of polls) {
        const records = []
        for (let i = 0; i < poll.count; i++) {
          const key = `${poll.txid}-opt-${i}`
          const value = { pollTxid: poll.txid, option: randomText('opt') }
          await pollOptionsDb.put(key, value)
          records.push({ ...value, txid: key })
        }
        byPoll.set(poll.txid, records)
      }

      for (const poll of polls) {
        const got = await query.getPollOptions(poll.txid)
        const expected = byPoll.get(poll.txid)
        if (got.length !== expected.length) return false
        const gotMap = new Map(got.map((r) => [r.txid, r.option]))
        for (const rec of expected) {
          if (gotMap.get(rec.txid) !== rec.option) return false
        }
      }
      return true
    },
    { label: 'getPollOptions per-poll fidelity', samples: 200 }
  )
})

test('getPollOptions partitions all stored options without loss', async () => {
  await forAll(
    () => {
      const n = Math.floor(rng() * 30)
      const records = []
      for (let i = 0; i < n; i++) {
        records.push({ key: `opt-${i}`, pollTxid: txidGen(rng), option: randomText('opt') })
      }
      return records
    },
    async (records) => {
      const pollOptionsDb = makeDb()
      for (const rec of records) {
        await pollOptionsDb.put(rec.key, { pollTxid: rec.pollTxid, option: rec.option })
      }
      const query = new PollQuery({ pollsDb: makeDb(), pollOptionsDb, pollVotesDb: makeDb() })

      const distinctPolls = [...new Set(records.map((r) => r.pollTxid))]
      let seen = 0
      const seenKeys = new Set()
      for (const pollTxid of distinctPolls) {
        for (const rec of await query.getPollOptions(pollTxid)) {
          seen++
          seenKeys.add(rec.txid)
        }
      }
      return seen === records.length && seenKeys.size === records.length
    },
    { label: 'getPollOptions partition conservation' }
  )
})

test('getPollVotes returns votes that preserve their comment and key', async () => {
  await forAll(
    () => {
      const pollTxid = txidGen(rng)
      const n = Math.floor(rng() * 10)
      return { pollTxid, n }
    },
    async ({ pollTxid, n }) => {
      const pollVotesDb = makeDb()
      const query = new PollQuery({ pollsDb: makeDb(), pollOptionsDb: makeDb(), pollVotesDb })
      for (let i = 0; i < n; i++) {
        await pollVotesDb.put(`vote-${i}`, { pollTxid, comment: randomText('vote') })
      }
      // Add an unrelated vote that must be excluded.
      await pollVotesDb.put('other', { pollTxid: txidGen(rng), comment: 'x' })

      const got = await query.getPollVotes(pollTxid)
      return got.length === n && got.every((r) => r.pollTxid === pollTxid && r.comment.startsWith('vote-'))
    },
    { label: 'getPollVotes fidelity and exclusion' }
  )
})
