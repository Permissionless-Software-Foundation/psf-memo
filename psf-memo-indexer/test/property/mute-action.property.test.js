/*
  Property tests for the indexer's mute action handler.

  These pin down invariants the unit tests only probe at fixed fixtures:

    - handleMute stores a record keyed `${signerAddr}:${muteePkHash}` with the
      exact mutee hash160, the correct unmute flag for the prefix, and the
      surrounding tx context, for any valid mute/unmute payload.
    - handleMute rejects a wrong-size mutee hash without storing a record and
      logs a process error instead.
*/

import test from 'node:test'

import { seededRandom, forAll } from './harness.js'
import { handleMute } from '../../src/use-cases/action-types/mute.js'
import { PREFIX_MUTE, PREFIX_UNMUTE, PK_HASH_LENGTH } from '../../src/lib/memo-codes.js'

const rng = seededRandom(20260829)

function randomHex (len) {
  const hex = '0123456789abcdef'
  let out = ''
  for (let i = 0; i < len; i++) {
    out += hex[Math.floor(rng() * 16)]
  }
  return out
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

test('handleMute stores the exact mutee hash, unmute flag, and tx context', async () => {
  await forAll(
    () => ({
      unmute: rng() < 0.5,
      hashHex: randomHex(PK_HASH_LENGTH * 2),
      signer: `bitcoincash:q${randomHex(40)}`,
      txid: randomHex(64),
      seen: Math.floor(rng() * 1e9),
      blockHeight: Math.floor(rng() * 1e6)
    }),
    async ({ unmute, hashHex, signer, txid, seen, blockHeight }) => {
      const adapters = {
        muteDb: makeDb(),
        processErrorDb: makeDb()
      }
      const prefix = unmute ? PREFIX_UNMUTE : PREFIX_MUTE

      await handleMute({
        adapters,
        txid,
        signerAddr: signer,
        seen,
        blockHeight,
        decoded: {
          action: unmute ? 'unmute' : 'mute',
          prefix,
          pushDatas: [prefix, Buffer.from(hashHex, 'hex')]
        }
      })

      const record = await adapters.muteDb.get(`${signer}:${hashHex}`)
      return record.muterAddr === signer &&
        record.muteePkHash === hashHex &&
        record.unmute === unmute &&
        record.txid === txid &&
        record.seen === seen &&
        record.blockHeight === blockHeight &&
        adapters.processErrorDb.entries().length === 0
    },
    { label: 'handleMute record invariants' }
  )
})

test('handleMute rejects a wrong-size mutee hash without storing', async () => {
  await forAll(
    () => ({
      badLen: 1 + Math.floor(rng() * 40)
    }),
    async ({ badLen }) => {
      if (badLen === PK_HASH_LENGTH) return true
      const adapters = {
        muteDb: makeDb(),
        processErrorDb: makeDb()
      }

      await handleMute({
        adapters,
        txid: 'txid-1',
        signerAddr: 'bitcoincash:qaddr-a',
        seen: 1,
        blockHeight: 100,
        decoded: {
          action: 'mute',
          prefix: PREFIX_MUTE,
          pushDatas: [PREFIX_MUTE, Buffer.alloc(badLen, 1)]
        }
      })

      let stored = false
      try {
        await adapters.muteDb.get('bitcoincash:qaddr-a:')
        stored = true
      } catch (err) {
        // expected: not stored
      }
      return !stored && adapters.processErrorDb.entries().length > 0
    },
    { label: 'wrong-size mutee hash rejection' }
  )
})
