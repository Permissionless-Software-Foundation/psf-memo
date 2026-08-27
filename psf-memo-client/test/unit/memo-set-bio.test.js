/*
  Unit tests for the Memo set-bio behavior.

  The set-bio action validates that the bio is non-empty and within the
  217-byte Memo protocol limit, then broadcasts it with the 0x6d05 prefix.
  A successful broadcast is reflected on the injected profile store.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const MemoSetBio = require('../../src/services/memo-set-bio')

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
    bios,
    setBio: (addr, bio) => { bios[addr] = bio },
    getBio: (addr) => bios[addr] || null
  }
}

test('setBio broadcasts with the Memo set-profile prefix', async () => {
  const wallet = makeWallet()
  const memoSetBio = new MemoSetBio({ wallet })

  await memoSetBio.setBio('Building on BCH')

  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, MemoSetBio.MEMO_SET_BIO_PREFIX)
  assert.equal(wallet.broadcasts[0].msg, 'Building on BCH')
})

test('setBio reflects the bio on the profile store', async () => {
  const wallet = makeWallet()
  const profiles = makeProfiles()
  const memoSetBio = new MemoSetBio({ wallet, profiles })

  await memoSetBio.setBio('Building on BCH')

  assert.equal(profiles.getBio(wallet.walletInfo.cashAddress), 'Building on BCH')
})

test('setBio rejects an empty bio', async () => {
  const wallet = makeWallet()
  const memoSetBio = new MemoSetBio({ wallet })

  await assert.rejects(
    () => memoSetBio.setBio(''),
    { code: 'bio_validation', message: /Bio must not be empty/ }
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('setBio rejects a bio that exceeds the byte limit', async () => {
  const wallet = makeWallet()
  const memoSetBio = new MemoSetBio({ wallet })

  // 218 ASCII bytes is one byte over the 217 limit.
  const tooLong = 'a'.repeat(MemoSetBio.MAX_BIO_BYTES + 1)

  await assert.rejects(
    () => memoSetBio.setBio(tooLong),
    { code: 'bio_length', message: /Bio is too long/ }
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('setBio accepts a bio exactly at the byte limit', async () => {
  const wallet = makeWallet()
  const memoSetBio = new MemoSetBio({ wallet })

  const exactly = 'a'.repeat(MemoSetBio.MAX_BIO_BYTES)

  await memoSetBio.setBio(exactly)

  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].msg, exactly)
})

test('setBio counts bytes, not characters', async () => {
  const wallet = makeWallet()
  const memoSetBio = new MemoSetBio({ wallet })

  // A single multi-byte character should be counted by byte length.
  await assert.rejects(
    () => memoSetBio.setBio('😀'.repeat(Math.ceil(MemoSetBio.MAX_BIO_BYTES / 4) + 1)),
    { code: 'bio_length' }
  )
})

test('setBio requires a wallet', async () => {
  const memoSetBio = new MemoSetBio({})

  await assert.rejects(
    () => memoSetBio.setBio('Building on BCH'),
    /Memo set bio requires a wallet/
  )
})

test('setBio surfaces a broadcast failure', async () => {
  const wallet = makeWallet()
  wallet.sendOpReturn = async () => { throw new Error('broadcast failed') }
  const memoSetBio = new MemoSetBio({ wallet })

  await assert.rejects(
    () => memoSetBio.setBio('Building on BCH'),
    /broadcast failed/
  )
})
