/*
  Property tests for the Memo set-avatar-url / profile-text behavior.

  The unit tests probe byte counting and the byte limit at a few fixed inputs.
  These properties cover broad input ranges so the invariants hold everywhere:

    - round trip: byteLength(s) equals TextEncoder bytes, and decoding the
      encoded form restores the original string.
    - ordering: byteLength never reports fewer bytes than characters.
    - conservation / boundary: an avatar URL within the byte limit broadcasts
      and is preserved exactly; a URL over the limit is rejected with
      avatar_url_length and never broadcast.
    - byte budget: the Set Avatar URL page's remaining count equals the byte
      budget minus the input's byte length for any input.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen } = require('./harness')
const MemoSetAvatarUrl = require('../../src/services/memo-set-avatar-url')
const SetAvatarUrlPage = require('../../src/services/set-avatar-url-page')
const { byteLength } = require('../../src/services/utf8')

const rng = seededRandom(20260829)

// A pool of code points mixing ASCII and multi-byte UTF-8 so a string's byte
// length differs from its character count. Held as separate strings so no
// surrogate pair is ever split.
const POOL = ['a', 'b', 'Z', ' ', '9', 'é', 'ñ', '你', '😀']

// Build a random string of at most maxChars characters.
function randomString (maxChars) {
  const len = intGen(rng, 0, maxChars)()
  let out = ''
  for (let i = 0; i < len; i++) {
    out += POOL[Math.floor(rng() * POOL.length)]
  }
  return out
}

// Build a random string whose byte length is at or under the avatar URL limit.
function inLimitUrl () {
  let s = randomString(intGen(rng, 0, 200)())
  while (byteLength(s) > MemoSetAvatarUrl.MAX_AVATAR_URL_BYTES) {
    s = randomString(intGen(rng, 0, 100)())
  }
  return s
}

// Build a random string guaranteed to exceed the avatar URL byte limit.
function overLimitUrl () {
  let s = randomString(intGen(rng, 0, 300)())
  while (byteLength(s) <= MemoSetAvatarUrl.MAX_AVATAR_URL_BYTES) {
    s += '😀'.repeat(5)
  }
  return s
}

function makeWallet (address = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d') {
  return {
    walletInfo: { cashAddress: address },
    broadcasts: [],
    async getUtxos () {
      return []
    },
    async sendOpReturn (msg, prefix) {
      this.broadcasts.push({ msg, prefix })
      return 'aa'.repeat(32)
    }
  }
}

function makeProfiles () {
  const avatarUrls = {}
  return {
    setAvatarUrl: (addr, url) => { avatarUrls[addr] = url },
    getAvatarUrl: (addr) => avatarUrls[addr] || null
  }
}

test('byteLength round-trips through TextEncoder and TextDecoder', async () => {
  await forAll(
    (i) => randomString(intGen(rng, 0, 60)()),
    (s) => {
      const bytes = new TextEncoder().encode(s)
      return bytes.length === byteLength(s) &&
        new TextDecoder().decode(bytes) === s
    },
    { label: 'utf8 byte-length round trip' }
  )
})

test('byteLength never reports fewer bytes than characters', async () => {
  await forAll(
    (i) => randomString(intGen(rng, 0, 60)()),
    (s) => byteLength(s) >= s.length,
    { label: 'utf8 bytes >= chars' }
  )
})

test('setAvatarUrl broadcasts and preserves any URL within the byte limit', async () => {
  await forAll(
    (i) => inLimitUrl(),
    async (url) => {
      // An empty/whitespace URL is a validation rejection, not a length case,
      // so it is out of scope for this broadcast property.
      if (url.trim().length === 0) return true

      const wallet = makeWallet()
      const profiles = makeProfiles()
      const memoSetAvatarUrl = new MemoSetAvatarUrl({ wallet, profiles })

      try {
        await memoSetAvatarUrl.setAvatarUrl(url)
      } catch (err) {
        return false
      }

      return wallet.broadcasts.length === 1 &&
        wallet.broadcasts[0].msg === url &&
        wallet.broadcasts[0].prefix === MemoSetAvatarUrl.MEMO_SET_AVATAR_URL_PREFIX &&
        profiles.getAvatarUrl(wallet.walletInfo.cashAddress) === url
    },
    { label: 'set-avatar-url broadcasts and preserves an in-limit URL' }
  )
})

test('setAvatarUrl rejects any URL over the byte limit without broadcasting', async () => {
  await forAll(
    (i) => overLimitUrl(),
    async (url) => {
      const wallet = makeWallet()
      const memoSetAvatarUrl = new MemoSetAvatarUrl({ wallet })

      try {
        await memoSetAvatarUrl.setAvatarUrl(url)
        return false // an over-limit URL must be rejected
      } catch (err) {
        return err.code === 'avatar_url_length' && wallet.broadcasts.length === 0
      }
    },
    { label: 'set-avatar-url rejects an over-limit URL without broadcasting' }
  )
})

test('the Set Avatar URL page remaining count conserves the byte budget', async () => {
  await forAll(
    (i) => randomString(intGen(rng, 0, 200)()),
    (url) => {
      const page = new SetAvatarUrlPage({ navigate: () => {} })
      page.setInput(url)
      return page.remainingCount() === MemoSetAvatarUrl.MAX_AVATAR_URL_BYTES - byteLength(url)
    },
    { label: 'set-avatar-url remaining byte count is conserved' }
  )
})
