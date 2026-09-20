/*
  Property tests for the Recent Profiles table view model.

  The unit tests probe buildRecentProfileAccount and buildRecentProfilesTable at
  fixed fixtures. These properties pin the view-model contract over broad random
  profiles:

    - Link round trip: the profile path percent-encodes the address and decodes
      back to it, for addresses mixing real cash-addr characters, routing
      punctuation, reserved URL characters, and unicode.
    - Display-name fallback: a non-empty name is shown verbatim; an absent name
      falls back to the truncated address.
    - Account mapping: the account preserves the address and maps the name,
      avatar (null when absent), and profile path.
    - Table shape: the headers stay fixed and there is exactly one account row
      per input profile, in input order.

  All generation is seeded, so runs are reproducible.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen } = require('./harness')
const {
  PROFILE_PATH_PREFIX,
  RECENT_PROFILES_TABLE_HEADERS,
  profilePath,
  accountDisplayName,
  buildRecentProfileAccount,
  buildRecentProfilesTable
} = require('../../src/services/recent-profiles-table')
const { truncateAddr } = require('../../src/util')

const rng = seededRandom(20260920)

const ADDR_CHARS = Array.from('abcdefghijklmnopqrstuvwxyz0123456789:?&=#%+/ são😀')
const NAMES = ['alice', 'bob', '名字', 'a/b', '', null, undefined]

function randomAddr () {
  const length = intGen(rng, 1, 64)()
  let addr = ''
  for (let i = 0; i < length; i++) {
    addr += ADDR_CHARS[Math.floor(rng() * ADDR_CHARS.length)]
  }
  return addr
}

function randomName () {
  return NAMES[Math.floor(rng() * NAMES.length)]
}

function randomProfile () {
  const profile = { addr: randomAddr(), name: randomName() }
  const roll = rng()
  if (roll < 0.6) {
    profile.profilePicUrl = `https://example.com/${encodeURIComponent(randomAddr())}.png`
  } else if (roll < 0.8) {
    profile.profilePicUrl = null
  } else {
    profile.profilePicUrl = undefined
  }
  return profile
}

function profileListGen () {
  return () => Array.from({ length: intGen(rng, 0, 12)() }, randomProfile)
}

test('profilePath percent-encodes the address and round-trips it', async () => {
  await forAll(
    (i) => randomAddr(),
    (addr) => {
      const path = profilePath(addr)
      if (!path.startsWith(`${PROFILE_PATH_PREFIX}/`)) return false
      return decodeURIComponent(path.slice(PROFILE_PATH_PREFIX.length + 1)) === addr
    },
    { label: 'recent profile path round trip' }
  )
})

test('accountDisplayName prefers a non-empty name and falls back to the truncated address', async () => {
  await forAll(
    (i) => ({ addr: randomAddr(), name: randomName() }),
    ({ addr, name }) => accountDisplayName(addr, name) === (name || truncateAddr(addr, 24)),
    { label: 'recent profile display name fallback' }
  )
})

test('buildRecentProfileAccount preserves the address and maps name, avatar, and path', async () => {
  await forAll(
    (i) => randomProfile(),
    (profile) => {
      const account = buildRecentProfileAccount(profile)
      return account.addr === profile.addr &&
        account.displayName === accountDisplayName(profile.addr, profile.name) &&
        account.avatarUrl === (profile.profilePicUrl || null) &&
        account.profilePath === profilePath(profile.addr)
    },
    { label: 'recent profile account mapping' }
  )
})

test('buildRecentProfilesTable keeps one account row per profile in input order', async () => {
  await forAll(
    profileListGen(),
    (profiles) => {
      const table = buildRecentProfilesTable(profiles)
      if (JSON.stringify(table.headers) !== JSON.stringify(RECENT_PROFILES_TABLE_HEADERS)) return false
      if (table.rows.length !== profiles.length) return false
      return table.rows.every((row, i) => {
        if (row.addr !== profiles[i].addr) return false
        return JSON.stringify(row.account) === JSON.stringify(buildRecentProfileAccount(profiles[i]))
      })
    },
    { label: 'recent profiles table rows' }
  )
})
