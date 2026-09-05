/*
  Property tests for the account page avatar display logic.

  The unit tests probe a few fixed inputs. These properties cover broad input
  combinations so the invariants hold everywhere:

    - precedence: getDisplayAvatarUrl prefers the profile store URL, then the
      fallback URL, then null.
    - consistency: hasAvatarImage is true exactly when getAvatarImageUrl is
      non-null, and getAvatarImageUrl always equals getDisplayAvatarUrl.
    - round trip: getAvatarUrl returns exactly the URL stored in the profile
      store (or null when none is stored).
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll } = require('./harness')
const AccountPage = require('../../src/services/account-page')

const rng = seededRandom(20260905)

// A pool of plausible avatar URLs so generated inputs vary.
const URL_POOL = [
  'https://example.com/avatar.png',
  'https://cdn.example.com/pics/me.jpg',
  'https://x.io/avatar.png',
  'https://static.example.org/img/me.webp'
]

// Generate a URL or null.
function maybeUrl () {
  if (rng() < 0.5) return null
  return URL_POOL[Math.floor(rng() * URL_POOL.length)]
}

function makeProfiles () {
  const avatarUrls = {}
  return {
    setAvatarUrl: (addr, url) => { avatarUrls[addr] = url },
    getAvatarUrl: (addr) => avatarUrls[addr] || null
  }
}

function makeWallet (address = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d') {
  return { walletInfo: { cashAddress: address } }
}

// Build a page with an optional stored profile URL and return it.
function makePage (profileUrl) {
  const profiles = makeProfiles()
  const wallet = makeWallet()
  const page = new AccountPage({ wallet, profiles })
  if (profileUrl) profiles.setAvatarUrl(wallet.walletInfo.cashAddress, profileUrl)
  return page
}

test('getDisplayAvatarUrl prefers the profile URL, then the fallback, then null', async () => {
  await forAll(
    (i) => ({ profileUrl: maybeUrl(), fallback: maybeUrl() }),
    ({ profileUrl, fallback }) => {
      const page = makePage(profileUrl)
      const expected = profileUrl || fallback || null
      return page.getDisplayAvatarUrl(fallback) === expected
    },
    { label: 'getDisplayAvatarUrl precedence' }
  )
})

test('hasAvatarImage and getAvatarImageUrl are consistent with getDisplayAvatarUrl', async () => {
  await forAll(
    (i) => ({ profileUrl: maybeUrl(), fallback: maybeUrl() }),
    ({ profileUrl, fallback }) => {
      const page = makePage(profileUrl)
      const url = page.getAvatarImageUrl(fallback)
      return page.hasAvatarImage(fallback) === (url !== null) &&
        url === page.getDisplayAvatarUrl(fallback)
    },
    { label: 'avatar image consistency' }
  )
})

test('getAvatarUrl round-trips the stored profile URL', async () => {
  await forAll(
    (i) => maybeUrl(),
    (url) => {
      const page = makePage(url)
      return page.getAvatarUrl() === url
    },
    { label: 'getAvatarUrl round trip' }
  )
})
