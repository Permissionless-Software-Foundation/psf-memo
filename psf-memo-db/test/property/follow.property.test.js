/*
  Property tests for the FollowQuery adapter.

  The unit tests probe isFollowing/listFollowing/listFollowers at a few fixed
  fixtures. These properties cover broad random record sets so the invariants
  hold everywhere:

    - round trip: a hash160 converts to a cash address and back to the same
      hash160.
    - isFollowing conservation: an active follow record reports true and an
      unfollow record reports false, regardless of surrounding records.
    - list consistency: listFollowing and listFollowers each return exactly
      the active relationships in their direction.
*/

import test from 'node:test'
import BCHJS from '@psf/bch-js'
import { seededRandom, forAll, intGen } from './harness.js'
import FollowQuery from '../../src/adapters/follow-query.js'

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

// An in-memory follows Db mirroring the LevelDB contract FollowQuery relies on.
function makeFollowsDb (records) {
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

// Build a random set of follow records: a mix of followers, hash160s, and
// follow/unfollow flags. Not every pair is recorded.
function recordSetGen () {
  const followers = []
  for (let i = 0, n = intGen(rng, 1, 6)(); i < n; i++) followers.push(`bitcoincash:q${hash160Gen()}`)
  const hash160s = []
  for (let i = 0, n = intGen(rng, 1, 6)(); i < n; i++) hash160s.push(hash160Gen())

  const records = []
  for (const follower of followers) {
    for (const hash160 of hash160s) {
      if (rng() < 0.4) continue
      records.push({ key: `${follower}:${hash160}`, unfollow: rng() < 0.5 })
    }
  }
  return { followers, hash160s, records }
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

test('isFollowing is true exactly for active follow records', async () => {
  await forAll(
    (i) => recordSetGen(),
    async ({ records }) => {
      const query = new FollowQuery({ followsDb: makeFollowsDb(records), bchjs })
      for (const record of records) {
        // Follower cash addresses contain a colon ('bitcoincash:q...'), so the
        // record key has two colons; the hash160 is the trailing segment.
        const sep = record.key.lastIndexOf(':')
        const follower = record.key.slice(0, sep)
        const hash160 = record.key.slice(sep + 1)
        const followee = bchjs.Address.hash160ToCash(hash160)
        const following = await query.isFollowing(follower, followee)
        if (following !== (record.unfollow !== true)) return false
      }
      return true
    },
    { label: 'isFollowing conservation' }
  )
})

test('listFollowing returns exactly the active followees for a follower', async () => {
  await forAll(
    (i) => recordSetGen(),
    async ({ followers, records }) => {
      const query = new FollowQuery({ followsDb: makeFollowsDb(records), bchjs })
      for (const follower of followers) {
        const prefix = `${follower}:`
        const expected = records
          .filter((r) => r.key.startsWith(prefix) && r.unfollow !== true)
          .map((r) => bchjs.Address.hash160ToCash(r.key.slice(prefix.length)))
        const got = (await query.listFollowing(follower)).sort()
        const want = Array.from(new Set(expected)).sort()
        if (JSON.stringify(got) !== JSON.stringify(want)) return false
      }
      return true
    },
    { label: 'listFollowing consistency' }
  )
})

test('listFollowers returns exactly the active followers for a followee', async () => {
  await forAll(
    (i) => recordSetGen(),
    async ({ hash160s, records }) => {
      const query = new FollowQuery({ followsDb: makeFollowsDb(records), bchjs })
      for (const hash160 of hash160s) {
        const suffix = `:${hash160}`
        const expected = records
          .filter((r) => r.key.endsWith(suffix) && r.unfollow !== true)
          .map((r) => r.key.slice(0, r.key.length - suffix.length))
        const got = (await query.listFollowers(bchjs.Address.hash160ToCash(hash160))).sort()
        const want = Array.from(new Set(expected)).sort()
        if (JSON.stringify(got) !== JSON.stringify(want)) return false
      }
      return true
    },
    { label: 'listFollowers consistency' }
  )
})
