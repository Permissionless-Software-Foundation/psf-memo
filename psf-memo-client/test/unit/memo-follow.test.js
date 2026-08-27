/*
  Unit tests for the Memo follow/unfollow behavior.

  The follow action validates the followee cash address, converts it to a
  20-byte hash160, and broadcasts it with the Memo follow (0x6d06) or unfollow
  (0x6d07) prefix. A successful broadcast is reflected on the injected profile
  store.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const MemoFollow = require('../../src/services/memo-follow')

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const FOLLOWEE_ADDRESS = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
const FOLLOWEE_HASH160 = 'cb481232299cd5743151ac4b2d63ae198e7bb0a9'

function makeBchjs () {
  return {
    Address: {
      toHash160 (addr) {
        if (addr === FOLLOWEE_ADDRESS) return FOLLOWEE_HASH160
        throw new Error('unsupported address in test')
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
    state,
    setFollowState: (selfAddr, targetAddr, isFollowing) => {
      if (!state[selfAddr]) state[selfAddr] = {}
      state[selfAddr][targetAddr] = isFollowing
    },
    getFollowState: (selfAddr, targetAddr) => state[selfAddr]?.[targetAddr] || false
  }
}

test('follow broadcasts with the Memo follow prefix and hash160 payload', async () => {
  const wallet = makeWallet()
  const memoFollow = new MemoFollow({ wallet })

  await memoFollow.follow(FOLLOWEE_ADDRESS)

  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, MemoFollow.MEMO_FOLLOW_PREFIX)
  assert.ok(Buffer.isBuffer(wallet.broadcasts[0].msg))
  assert.equal(wallet.broadcasts[0].msg.toString('hex'), FOLLOWEE_HASH160)
})

test('unfollow broadcasts with the Memo unfollow prefix and hash160 payload', async () => {
  const wallet = makeWallet()
  const memoFollow = new MemoFollow({ wallet })

  await memoFollow.unfollow(FOLLOWEE_ADDRESS)

  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, MemoFollow.MEMO_UNFOLLOW_PREFIX)
  assert.equal(wallet.broadcasts[0].msg.toString('hex'), FOLLOWEE_HASH160)
})

test('follow reflects the new follow state on the profile store', async () => {
  const wallet = makeWallet()
  const profiles = makeProfiles()
  const memoFollow = new MemoFollow({ wallet, profiles })

  await memoFollow.follow(FOLLOWEE_ADDRESS)

  assert.equal(profiles.getFollowState(MY_ADDRESS, FOLLOWEE_ADDRESS), true)
})

test('unfollow reflects the new unfollow state on the profile store', async () => {
  const wallet = makeWallet()
  const profiles = makeProfiles()
  const memoFollow = new MemoFollow({ wallet, profiles })

  await memoFollow.unfollow(FOLLOWEE_ADDRESS)

  assert.equal(profiles.getFollowState(MY_ADDRESS, FOLLOWEE_ADDRESS), false)
})

test('follow rejects an empty address', async () => {
  const wallet = makeWallet()
  const memoFollow = new MemoFollow({ wallet })

  await assert.rejects(
    () => memoFollow.follow(''),
    { code: 'follow_validation', message: /Follow address is required/ }
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('follow requires a wallet', async () => {
  const memoFollow = new MemoFollow({})

  await assert.rejects(
    () => memoFollow.follow(FOLLOWEE_ADDRESS),
    /Memo follow requires a wallet/
  )
})

test('follow requires bch-js on the wallet', async () => {
  const wallet = makeWallet()
  wallet.bchjs = null
  const memoFollow = new MemoFollow({ wallet })

  await assert.rejects(
    () => memoFollow.follow(FOLLOWEE_ADDRESS),
    /Wallet does not expose bch-js Address.toHash160/
  )
})

test('follow surfaces a broadcast failure', async () => {
  const wallet = makeWallet()
  wallet.sendOpReturn = async () => { throw new Error('broadcast failed') }
  const memoFollow = new MemoFollow({ wallet })

  await assert.rejects(
    () => memoFollow.follow(FOLLOWEE_ADDRESS),
    /broadcast failed/
  )
})
