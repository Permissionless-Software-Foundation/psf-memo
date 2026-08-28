/*
  Property tests for the indexer's poll action handlers.

  These pin down invariants the unit tests only probe at fixed fixtures:

    - normalizePollCreateDatas round-trips a poll_type / option_count /
      question triple through both the separate-push and the combined-push
      encodings.
    - storePollChildRecord (used by add-poll-option and poll-vote) stores the
      reverse-hex poll txid and the exact UTF-8 value for any valid payload,
      and rejects malformed payloads without storing.
*/

import test from 'node:test'

import { seededRandom, forAll } from './harness.js'
import { normalizePollCreateDatas } from '../../src/use-cases/action-types/poll-create.js'
import { handleAddPollOption } from '../../src/use-cases/action-types/poll-option.js'
import { handlePollVote } from '../../src/use-cases/action-types/poll-vote.js'

const rng = seededRandom(20260828)

function randomHex (len) {
  const hex = '0123456789abcdef'
  let out = ''
  for (let i = 0; i < len; i++) {
    out += hex[Math.floor(rng() * 16)]
  }
  return out
}

function randomText () {
  const charset = ['a', 'b', ' ', 'é']
  let s = ''
  const n = Math.floor(rng() * 20)
  for (let i = 0; i < n; i++) {
    s += charset[Math.floor(rng() * charset.length)]
  }
  return s
}

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

test('normalizePollCreateDatas round-trips separate pushes', async () => {
  await forAll(
    () => ({
      pollType: Math.floor(rng() * 256),
      optionCount: Math.floor(rng() * 256),
      question: randomText()
    }),
    ({ pollType, optionCount, question }) => {
      const prefix = Buffer.from('6d10', 'hex')
      const pushDatas = [
        prefix,
        Buffer.from([pollType]),
        Buffer.from([optionCount]),
        Buffer.from(question, 'utf8')
      ]
      const result = normalizePollCreateDatas(pushDatas)
      return result.ok &&
        result.pollType === pollType &&
        result.optionCount === optionCount &&
        result.question === question
    },
    { label: 'normalizePollCreateDatas separate-push round-trip' }
  )
})

test('normalizePollCreateDatas round-trips a combined push', async () => {
  await forAll(
    () => ({
      pollType: Math.floor(rng() * 256),
      optionCount: Math.floor(rng() * 256),
      question: randomText()
    }),
    ({ pollType, optionCount, question }) => {
      const prefix = Buffer.from('6d10', 'hex')
      const combined = Buffer.concat([
        Buffer.from([pollType]),
        Buffer.from([optionCount]),
        Buffer.from(question, 'utf8')
      ])
      const result = normalizePollCreateDatas([prefix, combined])
      return result.ok &&
        result.pollType === pollType &&
        result.optionCount === optionCount &&
        result.question === question
    },
    { label: 'normalizePollCreateDatas combined-push round-trip' }
  )
})

test('add-option and poll-vote store the reverse txid and exact value', async () => {
  await forAll(
    () => ({
      kind: Math.floor(rng() * 2),
      txidHex: randomHex(64),
      value: randomText()
    }),
    async ({ kind, txidHex, value }) => {
      if (value.length === 0) return true
      const adapters = {
        pollOptionDb: makeDb(),
        pollVoteDb: makeDb(),
        processErrorDb: makeDb()
      }
      const txidBytes = Buffer.from(txidHex, 'hex').reverse()
      const handler = kind === 0 ? handleAddPollOption : handlePollVote
      const store = kind === 0 ? adapters.pollOptionDb : adapters.pollVoteDb
      const field = kind === 0 ? 'option' : 'comment'

      await handler({
        adapters,
        txid: 'txid-1',
        signerAddr: 'bitcoincash:qaddr-a',
        seen: 1,
        blockHeight: 100,
        decoded: {
          action: kind === 0 ? 'addPollOption' : 'pollVote',
          prefix: Buffer.from(kind === 0 ? '6d13' : '6d14', 'hex'),
          pushDatas: [Buffer.from('6d', 'hex'), txidBytes, Buffer.from(value, 'utf8')]
        }
      })

      const record = await store.get('txid-1')
      return record.pollTxid === txidHex && record[field] === value &&
        adapters.processErrorDb.entries().length === 0
    },
    { label: 'add-option and poll-vote record invariants' }
  )
})

test('add-option and poll-vote reject a wrong-size txid without storing', async () => {
  await forAll(
    () => ({
      kind: Math.floor(rng() * 2),
      badLen: 1 + Math.floor(rng() * 40)
    }),
    async ({ kind, badLen }) => {
      if (badLen === 32) return true
      const adapters = {
        pollOptionDb: makeDb(),
        pollVoteDb: makeDb(),
        processErrorDb: makeDb()
      }
      const handler = kind === 0 ? handleAddPollOption : handlePollVote
      const store = kind === 0 ? adapters.pollOptionDb : adapters.pollVoteDb

      await handler({
        adapters,
        txid: 'txid-1',
        signerAddr: 'bitcoincash:qaddr-a',
        seen: 1,
        blockHeight: 100,
        decoded: {
          action: kind === 0 ? 'addPollOption' : 'pollVote',
          prefix: Buffer.from(kind === 0 ? '6d13' : '6d14', 'hex'),
          pushDatas: [Buffer.from('6d', 'hex'), Buffer.alloc(badLen, 1), Buffer.from('yes', 'utf8')]
        }
      })

      let stored = false
      try {
        await store.get('txid-1')
        stored = true
      } catch (err) {
        // expected: not stored
      }
      return !stored && adapters.processErrorDb.entries().length > 0
    },
    { label: 'wrong-size txid rejection' }
  )
})
