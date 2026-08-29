/*
  Property tests for the Memo mute/unmute behavior.

  The unit tests probe the broadcast at a couple of fixed addresses. These
  properties cover broad input ranges so the invariants hold everywhere:

    - conservation: mute() and unmute() each broadcast exactly one Memo
      action carrying the mutee's 20-byte hash160 payload.
    - hash length: the broadcast payload is always exactly PK_HASH_LENGTH
      bytes (a hash160).
    - round trip: mute then unmute toggles the reflected mute state back to
      false, and vice versa.
*/

'use strict'

const test = require('node:test')
const crypto = require('node:crypto')
const { seededRandom, forAll, intGen } = require('./harness')
const MemoMute = require('../../src/services/memo-mute')

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
    setMuteState: (selfAddr, targetAddr, isMuting) => {
      if (!state[selfAddr]) state[selfAddr] = {}
      state[selfAddr][targetAddr] = isMuting
    },
    getMuteState: (selfAddr, targetAddr) => state[selfAddr]?.[targetAddr] || false
  }
}

test('mute broadcasts exactly one hash160 payload with the mute prefix', async () => {
  await forAll(
    (i) => addressGen(),
    async (addr) => {
      const wallet = makeWallet()
      const memoMute = new MemoMute({ wallet })
      await memoMute.mute(addr)

      return wallet.broadcasts.length === 1 &&
        wallet.broadcasts[0].prefix === MemoMute.MEMO_MUTE_PREFIX &&
        Buffer.isBuffer(wallet.broadcasts[0].msg) &&
        wallet.broadcasts[0].msg.length === MemoMute.PK_HASH_LENGTH &&
        wallet.broadcasts[0].msg.toString('hex') === hash20(addr)
    },
    { label: 'mute broadcast conservation and hash160 length' }
  )
})

test('unmute broadcasts exactly one hash160 payload with the unmute prefix', async () => {
  await forAll(
    (i) => addressGen(),
    async (addr) => {
      const wallet = makeWallet()
      const memoMute = new MemoMute({ wallet })
      await memoMute.unmute(addr)

      return wallet.broadcasts.length === 1 &&
        wallet.broadcasts[0].prefix === MemoMute.MEMO_UNMUTE_PREFIX &&
        Buffer.isBuffer(wallet.broadcasts[0].msg) &&
        wallet.broadcasts[0].msg.length === MemoMute.PK_HASH_LENGTH &&
        wallet.broadcasts[0].msg.toString('hex') === hash20(addr)
    },
    { label: 'unmute broadcast conservation and hash160 length' }
  )
})

test('mute then unmute round-trips the reflected mute state', async () => {
  await forAll(
    (i) => addressGen(),
    async (addr) => {
      const wallet = makeWallet()
      const profiles = makeProfiles()
      const memoMute = new MemoMute({ wallet, profiles })

      await memoMute.mute(addr)
      const afterMute = profiles.getMuteState(MY_ADDRESS, addr)
      await memoMute.unmute(addr)
      const afterUnmute = profiles.getMuteState(MY_ADDRESS, addr)

      return afterMute === true && afterUnmute === false
    },
    { label: 'mute/unmute reflected state round trip' }
  )
})
