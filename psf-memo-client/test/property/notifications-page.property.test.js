/*
  Property tests for the notifications page profile resolution.

  The unit tests probe fixed profile fixtures. These properties pin the
  controller's profile-loading contract over broad random notification lists:

    - Resolution: load resolves exactly one profile per distinct actor address,
      using the name and picture records when present and an empty profile when
      a field is missing or the lookup throws.
    - Derivation: getEntries builds one entry per notification whose display
      name, avatar, profile link, and View Post flag match the notification and
      resolved profile.
    - Lookup: getEntryByAddr returns the entry for a loaded actor and null
      otherwise.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen } = require('./harness')
const NotificationsPage = require('../../src/services/notifications-page')
const { truncateAddr } = require('../../src/util')

const rng = seededRandom(20260918)

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const TYPES = ['like', 'reply', 'follow']

function makeWallet () {
  return { walletInfo: { cashAddress: MY_ADDRESS } }
}

// Per-address profile data: present, partial, or a throwing lookup.
function randomProfileData () {
  const roll = rng()
  if (roll < 0.2) return { throws: true }
  if (roll < 0.5) return {}
  return {
    name: rng() < 0.7 ? `name-${intGen(rng, 0, 99)()}` : null,
    profilePicUrl: rng() < 0.7 ? `https://example.com/${intGen(rng, 0, 99)()}.png` : null
  }
}

function fixtureGen () {
  return () => {
    const addrs = Array.from(
      { length: intGen(rng, 0, 4)() },
      (unused, i) => `addr-${i}`
    )
    const notifications = addrs.map((addr) => ({
      type: TYPES[Math.floor(rng() * TYPES.length)],
      txid: `tx-${addr}`,
      addr,
      postTxid: `post-${addr}`,
      text: `body ${addr}`
    }))
    const profiles = {}
    for (const addr of addrs) profiles[addr] = randomProfileData()
    return { addrs, notifications, profiles }
  }
}

function makeMemoDb (notifications, profiles) {
  return {
    async getNotifications () {
      return { notifications, pagination: { total: notifications.length } }
    },
    async getName (addr) {
      const profile = profiles[addr]
      if (profile?.throws) throw new Error('profile lookup failed')
      return profile?.name ? { name: profile.name } : null
    },
    async getProfilePic (addr) {
      const profile = profiles[addr]
      if (profile?.throws) throw new Error('profile lookup failed')
      return profile?.profilePicUrl ? { url: profile.profilePicUrl } : null
    }
  }
}

// The expected resolved profile for an address, mirroring the controller's
// fallback rules.
function expectedProfile (profile) {
  if (!profile || profile.throws) return { name: null, profilePicUrl: null }
  return {
    name: profile.name || null,
    profilePicUrl: profile.profilePicUrl || null
  }
}

test('load resolves exactly one profile per distinct actor address', async () => {
  await forAll(
    fixtureGen(),
    async ({ notifications, profiles }) => {
      const page = new NotificationsPage({
        memoDb: makeMemoDb(notifications, profiles),
        wallet: makeWallet()
      })

      const result = await page.load()
      const expectedAddrs = [...new Set(notifications.map((n) => n.addr))].sort()
      const actualAddrs = Object.keys(result.profiles).sort()

      if (JSON.stringify(actualAddrs) !== JSON.stringify(expectedAddrs)) return false
      return expectedAddrs.every((addr) => {
        const expected = expectedProfile(profiles[addr])
        const actual = result.profiles[addr]
        return actual.name === expected.name &&
          actual.profilePicUrl === expected.profilePicUrl
      })
    },
    { label: 'notifications page profile resolution' }
  )
})

test('getEntries derives each entry from the notification and resolved profile', async () => {
  await forAll(
    fixtureGen(),
    async ({ notifications, profiles }) => {
      const page = new NotificationsPage({
        memoDb: makeMemoDb(notifications, profiles),
        wallet: makeWallet()
      })

      await page.load()
      const entries = page.getEntries()
      if (entries.length !== notifications.length) return false

      return entries.every((entry, i) => {
        const notification = notifications[i]
        const profile = expectedProfile(profiles[notification.addr])
        return entry.addr === notification.addr &&
          entry.displayName === (profile.name || truncateAddr(notification.addr, 24)) &&
          entry.avatarUrl === profile.profilePicUrl &&
          entry.profilePath === `/profile/${encodeURIComponent(notification.addr)}` &&
          entry.showViewPost === (notification.type === 'like' || notification.type === 'reply')
      })
    },
    { label: 'notifications page entry derivation' }
  )
})

test('getEntryByAddr returns the first matching entry and null otherwise', async () => {
  await forAll(
    fixtureGen(),
    async ({ notifications, profiles }) => {
      const page = new NotificationsPage({
        memoDb: makeMemoDb(notifications, profiles),
        wallet: makeWallet()
      })

      await page.load()
      if (notifications.length === 0) return true

      const first = notifications[0]
      const entry = page.getEntryByAddr(first.addr)
      return entry !== null &&
        entry.txid === first.txid &&
        page.getEntryByAddr('addr-missing') === null
    },
    { label: 'notifications page actor lookup' }
  )
})
