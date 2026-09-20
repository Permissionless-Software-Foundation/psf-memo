/*
  Property tests for the profileRecency backfill and the recent-profiles read
  ordering.

  The unit tests probe fixed fixtures. These properties pin the invariants over
  broad random stores:

    - Conservation: backfillProfileRecency writes exactly the newest confirmed
      qualifying post per profile address, excluding replies, polls, and
      unconfirmed entries, and writes nothing for addresses without a profile.
    - Idempotence: a second backfill leaves the index byte-for-byte identical.
    - Stale removal: pre-existing records that no longer qualify are dropped.
    - Key round trip: partsFromAddrPostHeightKey recovers the address, height,
      and txid from a formatted addrPostHeights key, including cash addresses
      that contain colons.
    - Read ordering: ProfileQuery.listRecentProfiles returns the requested page
      in height-desc, seen-desc, address-asc order with conserved pagination.
*/

import test from 'node:test'

import { seededRandom, forAll, intGen, txidGen } from './harness.js'
import { backfillProfileRecency, partsFromAddrPostHeightKey } from '../../src/lib/backfill-profile-recency.js'
import ProfileQuery from '../../src/adapters/profile-query.js'
import { FakeDb } from '../support/level-double.js'

const rng = seededRandom(20260921)

const ADDRS = [
  'bitcoincash:qaddr-a',
  'bitcoincash:qaddr-b',
  'bitcoincash:qaddr-c',
  'bitcoincash:qaddr-d'
]

function pad (height) {
  return String(height).padStart(12, '0')
}

function addrPostHeightKey (addr, height, txid) {
  return `${addr}:${pad(height)}:${txid}`
}

function isNewer (candidate, current) {
  if (!current) return true
  if (candidate.blockHeight !== current.blockHeight) return candidate.blockHeight > current.blockHeight
  return candidate.seen > current.seen
}

function recencyWorldGen () {
  return () => {
    const chainBlockHeight = intGen(rng, 1000, 1100)()
    const stores = {
      profilesDb: new FakeDb(),
      postsDb: new FakeDb(),
      addrPostHeightsDb: new FakeDb(),
      postParentsDb: new FakeDb(),
      pollsDb: new FakeDb(),
      statusDb: new FakeDb([['status', { chainBlockHeight }]]),
      profileRecencyDb: new FakeDb()
    }
    const expected = new Map()
    let seq = 0

    for (const addr of ADDRS) {
      const hasProfile = rng() < 0.75
      if (hasProfile) {
        stores.profilesDb.store.set(addr, { text: `bio-${addr}`, txid: `profile-${addr}` })
      }

      const postCount = intGen(rng, 0, 5)()
      for (let i = 0; i < postCount; i++) {
        const txid = `tx-${seq++}`
        const blockHeight = chainBlockHeight + intGen(rng, -20, 20)()
        const seen = intGen(rng, 0, 1000)()
        stores.addrPostHeightsDb.store.set(addrPostHeightKey(addr, blockHeight, txid), { txid, addr, blockHeight })
        stores.postsDb.store.set(txid, { addr, seen, blockHeight })

        const roll = rng()
        if (roll < 0.25) {
          stores.postParentsDb.store.set(txid, { txid, parentTxid: 'parent' })
        } else if (roll < 0.5) {
          stores.pollsDb.store.set(txid, { txid })
        } else if (hasProfile && blockHeight <= chainBlockHeight) {
          const candidate = { addr, blockHeight, seen }
          if (isNewer(candidate, expected.get(addr))) expected.set(addr, candidate)
        }
      }
    }

    // Seed a stale record for an address that never qualifies so the backfill
    // must remove it as part of rebuilding the index.
    const staleAddr = 'bitcoincash:qaddr-stale'
    stores.profileRecencyDb.store.set(staleAddr, { addr: staleAddr, blockHeight: 999999, seen: 1 })

    return { stores, expected }
  }
}

function snapshot (db) {
  return JSON.stringify([...db.store.entries()].sort())
}

test('backfillProfileRecency conserves the newest confirmed qualifying post per profile', async () => {
  await forAll(recencyWorldGen(), async ({ stores, expected }) => {
    const result = await backfillProfileRecency(stores)

    if (result.profiles !== expected.size) return false
    if (stores.profileRecencyDb.store.size !== expected.size) return false

    for (const [addr, record] of expected) {
      const stored = stores.profileRecencyDb.store.get(addr)
      if (!stored) return false
      if (stored.addr !== record.addr) return false
      if (stored.blockHeight !== record.blockHeight) return false
      if (stored.seen !== record.seen) return false
    }

    const before = snapshot(stores.profileRecencyDb)
    await backfillProfileRecency(stores)
    return snapshot(stores.profileRecencyDb) === before
  }, { label: 'profile recency backfill conservation and idempotence' })
})

test('partsFromAddrPostHeightKey round-trips a formatted addrPostHeights key', async () => {
  await forAll(
    () => ({
      addr: ADDRS[Math.floor(rng() * ADDRS.length)],
      height: intGen(rng, 0, 9999999)(),
      txid: txidGen(rng)
    }),
    ({ addr, height, txid }) => {
      const parts = partsFromAddrPostHeightKey(addrPostHeightKey(addr, height, txid))
      return parts.addr === addr && parts.blockHeight === height && parts.txid === txid
    },
    { label: 'addrPostHeight key round trip' }
  )
})

function compareRecency (a, b) {
  if (b.blockHeight !== a.blockHeight) return b.blockHeight - a.blockHeight
  if (b.seen !== a.seen) return b.seen - a.seen
  if (a.addr === b.addr) return 0
  return a.addr < b.addr ? -1 : 1
}

function orderingWorldGen () {
  return () => {
    const count = intGen(rng, 0, 10)()
    const entries = []
    const profilesDb = new FakeDb()
    const profileRecencyDb = new FakeDb()

    for (let i = 0; i < count; i++) {
      const addr = `bitcoincash:qaddr-${i}`
      const blockHeight = intGen(rng, 0, 5)()
      const seen = intGen(rng, 0, 5)()
      entries.push({ addr, blockHeight, seen })
      profileRecencyDb.store.set(addr, { addr, blockHeight, seen })
      profilesDb.store.set(addr, { text: `bio ${i}`, txid: `profile-${i}` })
    }

    return {
      entries,
      profilesDb,
      profileRecencyDb,
      limit: intGen(rng, 0, 12)(),
      offset: intGen(rng, 0, count + 2)()
    }
  }
}

test('listRecentProfiles returns the ordering and pagination contract', async () => {
  await forAll(orderingWorldGen(), async ({ entries, profilesDb, profileRecencyDb, limit, offset }) => {
    const query = new ProfileQuery({ profilesDb, profileRecencyDb })

    const result = await query.listRecentProfiles({ limit, offset })

    const ordered = [...entries].sort(compareRecency)
    const expectedPage = ordered.slice(offset, offset + limit)

    if (result.total !== entries.length) return false
    if (result.profiles.length !== expectedPage.length) return false

    return result.profiles.every((profile, i) => {
      const source = expectedPage[i]
      const stored = profilesDb.store.get(source.addr)
      return profile.addr === source.addr &&
        profile.blockHeight === source.blockHeight &&
        profile.seen === source.seen &&
        profile.text === stored.text &&
        profile.txid === stored.txid
    })
  }, { label: 'recent profiles ordering and pagination' })
})
