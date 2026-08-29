/*
  Property tests for the MuteQuery adapter.

  The unit tests probe isMuted/listMuted at a few fixed fixtures. These
  properties cover broad random record sets so the invariants hold everywhere:

    - round trip: a hash160 converts to a cash address and back to the same
      hash160.
    - isMuted conservation: an active mute record reports true and an unmute
      record reports false, regardless of surrounding records.
    - list consistency: listMuted returns exactly the active mutees for a
      muter.
*/

import test from 'node:test'
import BCHJS from '@psf/bch-js'
import { seededRandom, forAll, intGen } from './harness.js'
import MuteQuery from '../../src/adapters/mute-query.js'

const rng = seededRandom(20260830)
const bchjs = new BCHJS({ restURL: 'https://api.fullstack.cash/v5/' })

const HEX = '0123456789abcdef'

function hash160Gen () {
  let out = ''
  for (let i = 0; i < 40; i++) {
    out += HEX[Math.floor(rng() * HEX.length)]
  }
  return out
}

// An in-memory mutes Db mirroring the LevelDB contract MuteQuery relies on.
function makeMutesDb (records) {
  const store = new Map(records.map((r) => [r.key, r]))
  return {
    async get (key) {
      if (!store.has(key)) {
        const err = new Error('not found')
        err.notFound = true
        throw err
      }
      return store.get(key)
    },
    iterator (opts = {}) {
      const entries = Array.from(store.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      const { gte, lt } = opts
      const filtered = entries.filter(([key]) => {
        if (gte && key < gte) return false
        if (lt && key >= lt) return false
        return true
      })
      let i = 0
      return {
        [Symbol.asyncIterator] () {
          return this
        },
        async next () {
          if (i >= filtered.length) return { value: undefined, done: true }
          const entry = filtered[i++]
          return { value: entry, done: false }
        },
        async close () {}
      }
    }
  }
}

// Build a random set of mute records: a mix of muters, hash160s, and
// mute/unmute flags. Not every pair is recorded.
function recordSetGen () {
  const muters = []
  for (let i = 0, n = intGen(rng, 1, 6)(); i < n; i++) muters.push(`bitcoincash:q${hash160Gen()}`)
  const hash160s = []
  for (let i = 0, n = intGen(rng, 1, 6)(); i < n; i++) hash160s.push(hash160Gen())

  const records = []
  for (const muter of muters) {
    for (const hash160 of hash160s) {
      if (rng() < 0.4) continue
      records.push({ key: `${muter}:${hash160}`, unmute: rng() < 0.5 })
    }
  }
  return { muters, hash160s, records }
}

test('hash160 to cash address and back round-trips to the same hash160', async () => {
  await forAll(
    (i) => hash160Gen(),
    (hash160) => {
      const cash = bchjs.Address.hash160ToCash(hash160)
      return bchjs.Address.toHash160(cash) === hash160
    },
    { label: 'hash160 <-> cash address round trip' }
  )
})

test('isMuted is true exactly for active mute records', async () => {
  await forAll(
    (i) => recordSetGen(),
    async ({ records }) => {
      const query = new MuteQuery({ mutesDb: makeMutesDb(records), bchjs })
      for (const record of records) {
        // Muter cash addresses contain a colon ('bitcoincash:q...'), so the
        // record key has two colons; the hash160 is the trailing segment.
        const sep = record.key.lastIndexOf(':')
        const muter = record.key.slice(0, sep)
        const hash160 = record.key.slice(sep + 1)
        const mutee = bchjs.Address.hash160ToCash(hash160)
        const muted = await query.isMuted(muter, mutee)
        if (muted !== (record.unmute !== true)) return false
      }
      return true
    },
    { label: 'isMuted conservation' }
  )
})

test('listMuted returns exactly the active mutees for a muter', async () => {
  await forAll(
    (i) => recordSetGen(),
    async ({ muters, records }) => {
      const query = new MuteQuery({ mutesDb: makeMutesDb(records), bchjs })
      for (const muter of muters) {
        const prefix = `${muter}:`
        const expected = records
          .filter((r) => r.key.startsWith(prefix) && r.unmute !== true)
          .map((r) => bchjs.Address.hash160ToCash(r.key.slice(prefix.length)))
        const got = (await query.listMuted(muter)).sort()
        const want = Array.from(new Set(expected)).sort()
        if (JSON.stringify(got) !== JSON.stringify(want)) return false
      }
      return true
    },
    { label: 'listMuted consistency' }
  )
})
