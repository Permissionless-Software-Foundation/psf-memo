/*
  Property tests for the Memo set-bio / profile-text behavior.

  The unit tests probe byte counting and the byte limit at a few fixed inputs.
  These properties cover broad input ranges so the invariants hold everywhere:

    - round trip: byteLength(s) equals TextEncoder bytes, and decoding the
      encoded form restores the original string.
    - ordering: byteLength never reports fewer bytes than characters.
    - conservation / boundary: a bio within the byte limit broadcasts and is
      preserved exactly; a bio over the limit is rejected with bio_length and
      never broadcast.
    - byte budget: the Set Bio page's remaining count equals the byte budget
      minus the input's byte length for any input.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen } = require('./harness')
const MemoSetBio = require('../../src/services/memo-set-bio')
const SetBioPage = require('../../src/services/set-bio-page')
const { byteLength } = require('../../src/services/utf8')

const rng = seededRandom(20260828)

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

// Build a random string whose byte length is at or under the bio limit.
function inLimitBio () {
  let s = randomString(intGen(rng, 0, 200)())
  while (byteLength(s) > MemoSetBio.MAX_BIO_BYTES) {
    s = randomString(intGen(rng, 0, 100)())
  }
  return s
}

// Build a random string guaranteed to exceed the bio byte limit.
function overLimitBio () {
  let s = randomString(intGen(rng, 0, 300)())
  while (byteLength(s) <= MemoSetBio.MAX_BIO_BYTES) {
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
  const bios = {}
  return {
    setBio: (addr, bio) => { bios[addr] = bio },
    getBio: (addr) => bios[addr] || null
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

test('setBio broadcasts and preserves any bio within the byte limit', async () => {
  await forAll(
    (i) => inLimitBio(),
    async (bio) => {
      // An empty/whitespace bio is a validation rejection, not a length case,
      // so it is out of scope for this broadcast property.
      if (bio.trim().length === 0) return true

      const wallet = makeWallet()
      const profiles = makeProfiles()
      const memoSetBio = new MemoSetBio({ wallet, profiles })

      try {
        await memoSetBio.setBio(bio)
      } catch (err) {
        return false
      }

      return wallet.broadcasts.length === 1 &&
        wallet.broadcasts[0].msg === bio &&
        wallet.broadcasts[0].prefix === MemoSetBio.MEMO_SET_BIO_PREFIX &&
        profiles.getBio(wallet.walletInfo.cashAddress) === bio
    },
    { label: 'set-bio broadcasts and preserves an in-limit bio' }
  )
})

test('setBio rejects any bio over the byte limit without broadcasting', async () => {
  await forAll(
    (i) => overLimitBio(),
    async (bio) => {
      const wallet = makeWallet()
      const memoSetBio = new MemoSetBio({ wallet })

      try {
        await memoSetBio.setBio(bio)
        return false // an over-limit bio must be rejected
      } catch (err) {
        return err.code === 'bio_length' && wallet.broadcasts.length === 0
      }
    },
    { label: 'set-bio rejects an over-limit bio without broadcasting' }
  )
})

test('the Set Bio page remaining count conserves the byte budget', async () => {
  await forAll(
    (i) => randomString(intGen(rng, 0, 200)()),
    (bio) => {
      const page = new SetBioPage({ navigate: () => {} })
      page.setInput(bio)
      return page.remainingCount() === MemoSetBio.MAX_BIO_BYTES - byteLength(bio)
    },
    { label: 'set-bio remaining byte count is conserved' }
  )
})
