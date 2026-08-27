/*
  Property tests for the Memo follow/unfollow behavior.

  The unit tests probe the broadcast at a couple of fixed addresses. These
  properties cover broad input ranges so the invariants hold everywhere:

    - conservation: follow() and unfollow() each broadcast exactly one Memo
      action carrying the followee's 20-byte hash160 payload.
    - hash length: the broadcast payload is always exactly PK_HASH_LENGTH
      bytes (a hash160).
    - round trip: follow then unfollow toggles the reflected follow state
      back to false, and vice versa.
*/

'use strict'

const test = require('node:test')
const crypto = require('node:crypto')
const { seededRandom, forAll, intGen } = require('./harness')
const MemoFollow = require('../../src/services/memo-follow')

const rng = seededRandom(20260830)

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const CHARS = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'

// Deterministic 20-byte hash160 hex for any input string, mirroring what a
// real wallet's bch-js produces for a valid cash address.
function hash20 (s) {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 40)
}

// Random cash-address-shaped string (never empty so it passes validation).
function addressGen () {
  const len = intGen(rng, 40, 60)()
  let out = 'bitcoincash:q'
  for (let i = 0; i < len; i++) {
    out += CHARS[Math.floor(rng() * CHARS.length)]
  }
  return out
}

function makeBchjs () {
  return {
    Address: {
      toHash160 (addr) {
        return hash20(addr)
      }
    }
  }
}

function makeWallet (address = MY_ADDRESS) {
  return {
    walletInfo: { cashAddress: address },
    bchjs: makeBchjs(),
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
  const state = {}
  return {
    setFollowState: (selfAddr, targetAddr, isFollowing) => {
      if (!state[selfAddr]) state[selfAddr] = {}
      state[selfAddr][targetAddr] = isFollowing
    },
    getFollowState: (selfAddr, targetAddr) => state[selfAddr]?.[targetAddr] || false
  }
}

test('follow broadcasts exactly one hash160 payload with the follow prefix', async () => {
  await forAll(
    (i) => addressGen(),
    async (addr) => {
      const wallet = makeWallet()
      const memoFollow = new MemoFollow({ wallet })
      await memoFollow.follow(addr)

      return wallet.broadcasts.length === 1 &&
        wallet.broadcasts[0].prefix === MemoFollow.MEMO_FOLLOW_PREFIX &&
        Buffer.isBuffer(wallet.broadcasts[0].msg) &&
        wallet.broadcasts[0].msg.length === MemoFollow.PK_HASH_LENGTH &&
        wallet.broadcasts[0].msg.toString('hex') === hash20(addr)
    },
    { label: 'follow broadcast conservation and hash160 length' }
  )
})

test('unfollow broadcasts exactly one hash160 payload with the unfollow prefix', async () => {
  await forAll(
    (i) => addressGen(),
    async (addr) => {
      const wallet = makeWallet()
      const memoFollow = new MemoFollow({ wallet })
      await memoFollow.unfollow(addr)

      return wallet.broadcasts.length === 1 &&
        wallet.broadcasts[0].prefix === MemoFollow.MEMO_UNFOLLOW_PREFIX &&
        Buffer.isBuffer(wallet.broadcasts[0].msg) &&
        wallet.broadcasts[0].msg.length === MemoFollow.PK_HASH_LENGTH &&
        wallet.broadcasts[0].msg.toString('hex') === hash20(addr)
    },
    { label: 'unfollow broadcast conservation and hash160 length' }
  )
})

test('follow then unfollow round-trips the reflected follow state', async () => {
  await forAll(
    (i) => addressGen(),
    async (addr) => {
      const wallet = makeWallet()
      const profiles = makeProfiles()
      const memoFollow = new MemoFollow({ wallet, profiles })

      await memoFollow.follow(addr)
      const afterFollow = profiles.getFollowState(MY_ADDRESS, addr)
      await memoFollow.unfollow(addr)
      const afterUnfollow = profiles.getFollowState(MY_ADDRESS, addr)

      return afterFollow === true && afterUnfollow === false
    },
    { label: 'follow/unfollow reflected state round trip' }
  )
})
