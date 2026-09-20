/*
  Property tests for the /profile/recent identity join.

  The unit tests probe fixed fixtures. These properties cover broad random
  record sets for both the ProfileQuery join and the ListRecentProfiles page
  enrichment:

    - Field independence: the display name and avatar each come from their own
      address-keyed store and are null only when that store has no record.
    - Missing stores: an adapter built without the names/profilePics stores
      reports a null identity instead of throwing.
    - Page-only join: exactly the requested page is enriched, once per profile,
      in page order.
    - Order conservation: the returned page is the matching slice of the
      block-height-descending order.
    - Pagination conservation: limit, offset, total, and hasMore are unchanged
      by the join.

  All generation is seeded, so runs are reproducible.
*/

import test from 'node:test'
import { seededRandom, forAll, intGen, txidGen } from './harness.js'
import ProfileQuery from '../../src/adapters/profile-query.js'
import ListRecentProfiles from '../../src/use-cases/list-recent-profiles.js'
import { sortByHeightDesc } from '../../src/lib/search.js'

const rng = seededRandom(20260920)

function notFoundError () {
  const err = new Error('not found')
  err.notFound = true
  return err
}

function makeDb (records) {
  return {
    get: async (key) => {
      if (Object.prototype.hasOwnProperty.call(records, key)) return records[key]
      throw notFoundError()
    }
  }
}

function identitySetGen () {
  const addrs = []
  const names = {}
  const pictures = {}
  const count = intGen(rng, 0, 8)()
  for (let i = 0; i < count; i++) {
    const addr = `addr${i}`
    addrs.push(addr)
    if (rng() < 0.7) {
      names[addr] = { name: `name${i}`, txid: txidGen(rng), blockHeight: intGen(rng, 0, 1000000)() }
    }
    if (rng() < 0.7) {
      pictures[addr] = { url: `https://example.com/${i}.png`, txid: txidGen(rng), blockHeight: intGen(rng, 0, 1000000)() }
    }
  }
  return { addrs, names, pictures }
}

test('getProfileIdentity resolves name and avatar independently from their stores', async () => {
  await forAll(
    (i) => identitySetGen(),
    async ({ addrs, names, pictures }) => {
      const query = new ProfileQuery({
        profilesDb: { iterator: () => {} },
        namesDb: makeDb(names),
        profilePicsDb: makeDb(pictures)
      })

      for (const addr of addrs) {
        const identity = await query.getProfileIdentity(addr)
        if (identity.name !== (names[addr]?.name ?? null)) return false
        if (identity.profilePicUrl !== (pictures[addr]?.url ?? null)) return false
      }
      return true
    },
    { label: 'profile identity join' }
  )
})

test('getProfileIdentity reports null fields when a store is not configured', async () => {
  await forAll(
    (i) => identitySetGen(),
    async ({ addrs }) => {
      const query = new ProfileQuery({ profilesDb: { iterator: () => {} } })

      for (const addr of addrs) {
        const identity = await query.getProfileIdentity(addr)
        if (identity.name !== null || identity.profilePicUrl !== null) return false
      }
      return true
    },
    { label: 'profile identity missing stores' }
  )
})

function recentProfilesSetGen () {
  const profiles = []
  const identities = {}
  const count = intGen(rng, 0, 8)()
  for (let i = 0; i < count; i++) {
    const addr = `addr${i}`
    profiles.push({
      addr,
      text: `bio ${i}`,
      txid: txidGen(rng),
      seen: intGen(rng, 0, 1000)(),
      // Unique block heights make the descending order total.
      blockHeight: 1000 + i
    })
    identities[addr] = {
      name: rng() < 0.5 ? `name${i}` : null,
      profilePicUrl: rng() < 0.5 ? `https://example.com/${i}.png` : null
    }
  }
  return { profiles, identities }
}

function makeUseCase (profiles, identities, joined) {
  return new ListRecentProfiles({
    adapters: {
      profileQuery: {
        scanProfilesWithBlockHeight: async () => profiles.map((profile) => ({ ...profile })),
        getProfileIdentity: async (addr) => {
          joined.push(addr)
          return identities[addr]
        }
      }
    }
  })
}

test('ListRecentProfiles enriches exactly the requested page without changing order or pagination', async () => {
  await forAll(
    (i) => {
      const { profiles, identities } = recentProfilesSetGen()
      return {
        profiles,
        identities,
        limit: intGen(rng, 1, 12)(),
        offset: intGen(rng, 0, profiles.length + 2)()
      }
    },
    async ({ profiles, identities, limit, offset }) => {
      const joined = []
      const result = await makeUseCase(profiles, identities, joined).execute({ limit, offset })

      const expectedOrder = [...profiles].sort(sortByHeightDesc)
      const expectedPage = expectedOrder.slice(offset, offset + limit)

      if (result.profiles.length !== expectedPage.length) return false
      if (result.pagination.limit !== limit) return false
      if (result.pagination.offset !== offset) return false
      if (result.pagination.total !== profiles.length) return false
      if (result.pagination.hasMore !== (offset + result.profiles.length < profiles.length)) return false

      if (joined.length !== expectedPage.length) return false
      if (joined.some((addr, i) => addr !== expectedPage[i].addr)) return false

      return result.profiles.every((profile, i) => {
        const source = expectedPage[i]
        const identity = identities[source.addr]
        return profile.addr === source.addr &&
          profile.text === source.text &&
          profile.txid === source.txid &&
          profile.seen === source.seen &&
          profile.blockHeight === source.blockHeight &&
          profile.name === identity.name &&
          profile.profilePicUrl === identity.profilePicUrl
      })
    },
    { label: 'recent profiles page enrichment' }
  )
})
