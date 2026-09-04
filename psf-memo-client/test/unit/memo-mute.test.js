/*
  Unit tests for the Memo mute/unmute behavior.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const MemoMute = require('../../src/services/memo-mute')

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const MUTEE_ADDRESS = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
const MUTEE_HASH160 = 'cb481232299cd5743151ac4b2d63ae198e7bb0a9'

function broadcastHex (wallet, index = 0) {
  return Buffer.from(wallet.broadcasts[index].msg).toString('hex')
}

function makeBchjs () {
  return {
    Address: {
      toHash160 (addr) {
        if (addr === MUTEE_ADDRESS) return MUTEE_HASH160
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
    setMuteState: (selfAddr, targetAddr, isMuted) => {
      if (!state[selfAddr]) state[selfAddr] = {}
      state[selfAddr][targetAddr] = isMuted
    },
    getMuteState: (selfAddr, targetAddr) => state[selfAddr]?.[targetAddr] || false
  }
}

test('mute broadcasts with the Memo mute prefix and hash160 payload', async () => {
  const wallet = makeWallet()
  const memoMute = new MemoMute({ wallet })

  await memoMute.mute(MUTEE_ADDRESS)

  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, MemoMute.MEMO_MUTE_PREFIX)
  assert.equal(wallet.broadcasts[0].msg.length, MemoMute.PK_HASH_LENGTH)
  assert.equal(broadcastHex(wallet, 0), MUTEE_HASH160)
})

test('unmute broadcasts with the Memo unmute prefix and hash160 payload', async () => {
  const wallet = makeWallet()
  const memoMute = new MemoMute({ wallet })

  await memoMute.unmute(MUTEE_ADDRESS)

  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, MemoMute.MEMO_UNMUTE_PREFIX)
  assert.equal(wallet.broadcasts[0].msg.length, MemoMute.PK_HASH_LENGTH)
  assert.equal(broadcastHex(wallet, 0), MUTEE_HASH160)
})

test('mute reflects the new mute state on the profile store', async () => {
  const wallet = makeWallet()
  const profiles = makeProfiles()
  const memoMute = new MemoMute({ wallet, profiles })

  await memoMute.mute(MUTEE_ADDRESS)

  assert.equal(profiles.getMuteState(MY_ADDRESS, MUTEE_ADDRESS), true)
})

test('unmute reflects the new unmute state on the profile store', async () => {
  const wallet = makeWallet()
  const profiles = makeProfiles()
  const memoMute = new MemoMute({ wallet, profiles })

  await memoMute.unmute(MUTEE_ADDRESS)

  assert.equal(profiles.getMuteState(MY_ADDRESS, MUTEE_ADDRESS), false)
})

test('validate returns ok for a valid mutee address', () => {
  const wallet = makeWallet()
  const memoMute = new MemoMute({ wallet })

  const result = memoMute.validate(MUTEE_ADDRESS)

  assert.deepEqual(result, { ok: true })
})

test('mute rejects an empty address', async () => {
  const wallet = makeWallet()
  const memoMute = new MemoMute({ wallet })

  await assert.rejects(
    () => memoMute.mute(''),
    { code: 'mute_validation', message: /Mute address is required/ }
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('mute requires a wallet', async () => {
  const memoMute = new MemoMute({})

  await assert.rejects(
    () => memoMute.mute(MUTEE_ADDRESS),
    /Memo mute requires a wallet/
  )
})

test('mute requires bch-js on the wallet', async () => {
  const wallet = makeWallet()
  wallet.bchjs = null
  const memoMute = new MemoMute({ wallet })

  await assert.rejects(
    () => memoMute.mute(MUTEE_ADDRESS),
    /Wallet does not expose bch-js Address.toHash160/
  )
})

test('mute surfaces a broadcast failure', async () => {
  const wallet = makeWallet()
  wallet.sendOpReturn = async () => { throw new Error('broadcast failed') }
  const memoMute = new MemoMute({ wallet })

  await assert.rejects(
    () => memoMute.mute(MUTEE_ADDRESS),
    /broadcast failed/
  )
})
