/*
  Unit tests for the Memo set-avatar-url behavior.

  The set-avatar-url action validates that the avatar URL is non-empty and
  within the 217-byte Memo protocol limit, then broadcasts it with the
  0x6d0a prefix. A successful broadcast is reflected on the injected profile
  store.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const MemoSetAvatarUrl = require('../../src/services/memo-set-avatar-url')

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
    avatarUrls,
    setAvatarUrl: (addr, url) => { avatarUrls[addr] = url },
    getAvatarUrl: (addr) => avatarUrls[addr] || null
  }
}

test('setAvatarUrl broadcasts with the Memo set-profile-picture prefix', async () => {
  const wallet = makeWallet()
  const memoSetAvatarUrl = new MemoSetAvatarUrl({ wallet })

  await memoSetAvatarUrl.setAvatarUrl('https://example.com/avatar.png')

  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, MemoSetAvatarUrl.MEMO_SET_AVATAR_URL_PREFIX)
  assert.equal(wallet.broadcasts[0].msg, 'https://example.com/avatar.png')
})

test('setAvatarUrl reflects the URL on the profile store', async () => {
  const wallet = makeWallet()
  const profiles = makeProfiles()
  const memoSetAvatarUrl = new MemoSetAvatarUrl({ wallet, profiles })

  await memoSetAvatarUrl.setAvatarUrl('https://example.com/avatar.png')

  assert.equal(profiles.getAvatarUrl(wallet.walletInfo.cashAddress), 'https://example.com/avatar.png')
})

test('setAvatarUrl rejects an empty URL', async () => {
  const wallet = makeWallet()
  const memoSetAvatarUrl = new MemoSetAvatarUrl({ wallet })

  await assert.rejects(
    () => memoSetAvatarUrl.setAvatarUrl(''),
    { code: 'avatar_url_validation', message: /Avatar URL must not be empty/ }
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('setAvatarUrl rejects a URL that exceeds the byte limit', async () => {
  const wallet = makeWallet()
  const memoSetAvatarUrl = new MemoSetAvatarUrl({ wallet })

  // 218 ASCII bytes is one byte over the 217 limit.
  const tooLong = 'a'.repeat(MemoSetAvatarUrl.MAX_AVATAR_URL_BYTES + 1)

  await assert.rejects(
    () => memoSetAvatarUrl.setAvatarUrl(tooLong),
    { code: 'avatar_url_length', message: /Avatar URL is too long/ }
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('setAvatarUrl accepts a URL exactly at the byte limit', async () => {
  const wallet = makeWallet()
  const memoSetAvatarUrl = new MemoSetAvatarUrl({ wallet })

  const exactly = 'a'.repeat(MemoSetAvatarUrl.MAX_AVATAR_URL_BYTES)

  await memoSetAvatarUrl.setAvatarUrl(exactly)

  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].msg, exactly)
})

test('setAvatarUrl counts bytes, not characters', async () => {
  const wallet = makeWallet()
  const memoSetAvatarUrl = new MemoSetAvatarUrl({ wallet })

  // A single multi-byte character should be counted by byte length.
  await assert.rejects(
    () => memoSetAvatarUrl.setAvatarUrl('😀'.repeat(Math.ceil(MemoSetAvatarUrl.MAX_AVATAR_URL_BYTES / 4) + 1)),
    { code: 'avatar_url_length' }
  )
})

test('setAvatarUrl requires a wallet', async () => {
  const memoSetAvatarUrl = new MemoSetAvatarUrl({})

  await assert.rejects(
    () => memoSetAvatarUrl.setAvatarUrl('https://example.com/avatar.png'),
    /Memo set avatar URL requires a wallet/
  )
})

test('setAvatarUrl surfaces a broadcast failure', async () => {
  const wallet = makeWallet()
  wallet.sendOpReturn = async () => { throw new Error('broadcast failed') }
  const memoSetAvatarUrl = new MemoSetAvatarUrl({ wallet })

  await assert.rejects(
    () => memoSetAvatarUrl.setAvatarUrl('https://example.com/avatar.png'),
    /broadcast failed/
  )
})
