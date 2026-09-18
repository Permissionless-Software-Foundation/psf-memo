/*
  Unit tests for the notifications page controller.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const NotificationsPage = require('../../src/services/notifications-page')

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twtmvr4fxw672whkjy0py26r63g3d'

function makeWallet () {
  return {
    walletInfo: { cashAddress: MY_ADDRESS }
  }
}

function makeMemoDb (notifications, pagination) {
  return {
    async getNotifications (addr, { limit, offset }) {
      return { notifications, pagination }
    }
  }
}

test('load returns notifications', async () => {
  const notifications = [
    { type: 'reply', txid: 'a'.repeat(64), addr: 'bitcoincash:other', text: 'hi' },
    { type: 'like', txid: 'b'.repeat(64), addr: 'bitcoincash:other2' }
  ]
  const page = new NotificationsPage({
    memoDb: makeMemoDb(notifications, { total: 2 }),
    wallet: makeWallet()
  })

  const result = await page.load()

  assert.deepEqual(result.notifications, notifications)
  assert.equal(result.pagination.total, 2)
  assert.equal(result.empty, false)
})

test('load marks empty notifications at offset zero', async () => {
  const page = new NotificationsPage({
    memoDb: makeMemoDb([], { total: 0 }),
    wallet: makeWallet()
  })

  const result = await page.load()

  assert.deepEqual(result.notifications, [])
  assert.equal(result.empty, true)
})

test('load does not mark empty paginated page as empty', async () => {
  const page = new NotificationsPage({
    memoDb: makeMemoDb([], { total: 2 }),
    wallet: makeWallet()
  })

  const result = await page.load({ offset: 100 })

  assert.equal(result.empty, false)
})

test('load forwards limit and offset to the memo db client', async () => {
  const calls = []
  const memoDb = {
    async getNotifications (addr, params) {
      calls.push({ addr, params })
      return { notifications: [], pagination: {} }
    }
  }
  const page = new NotificationsPage({ memoDb, wallet: makeWallet() })

  await page.load({ limit: 10, offset: 20 })

  assert.deepEqual(calls, [{ addr: MY_ADDRESS, params: { limit: 10, offset: 20 } }])
})

test('load defaults limit to 50 and offset to 0', async () => {
  const calls = []
  const memoDb = {
    async getNotifications (addr, params) {
      calls.push({ addr, params })
      return { notifications: [], pagination: {} }
    }
  }
  const page = new NotificationsPage({ memoDb, wallet: makeWallet() })

  await page.load()

  assert.deepEqual(calls, [{ addr: MY_ADDRESS, params: { limit: 50, offset: 0 } }])
})

test('load throws when no memo db client is provided', async () => {
  const page = new NotificationsPage({ wallet: makeWallet() })

  await assert.rejects(
    () => page.load(),
    /requires a memo db client/
  )
})

test('load throws when no wallet is provided', async () => {
  const page = new NotificationsPage({ memoDb: makeMemoDb([], {}) })

  await assert.rejects(
    () => page.load(),
    /requires an authenticated wallet/
  )
})

test('canLoadMore reflects pagination.hasMore', async () => {
  const pageMore = new NotificationsPage({
    memoDb: makeMemoDb([], { hasMore: true }),
    wallet: makeWallet()
  })
  await pageMore.load()
  assert.equal(pageMore.canLoadMore(), true)

  const pageDone = new NotificationsPage({
    memoDb: makeMemoDb([], { hasMore: false }),
    wallet: makeWallet()
  })
  await pageDone.load()
  assert.equal(pageDone.canLoadMore(), false)
})

test('canLoadMore returns false when pagination is null or missing hasMore', async () => {
  const pageNull = new NotificationsPage({
    memoDb: makeMemoDb([], null),
    wallet: makeWallet()
  })
  await pageNull.load()
  assert.equal(pageNull.canLoadMore(), false)

  const pageEmpty = new NotificationsPage({
    memoDb: makeMemoDb([], { total: 0 }),
    wallet: makeWallet()
  })
  await pageEmpty.load()
  assert.equal(pageEmpty.canLoadMore(), false)
})

test('getNotification returns a loaded notification by txid', async () => {
  const notifications = [{ type: 'follow', txid: 'a'.repeat(64), addr: 'bitcoincash:other' }]
  const page = new NotificationsPage({
    memoDb: makeMemoDb(notifications, {}),
    wallet: makeWallet()
  })

  await page.load()

  assert.equal(page.getNotification('a'.repeat(64)).type, 'follow')
})

test('exposes the notifications path', () => {
  assert.equal(NotificationsPage.NOTIFICATIONS_PATH, '/notifications')
})

function makeProfileMemoDb (notifications, pagination, profiles = {}) {
  return {
    async getNotifications () {
      return { notifications, pagination }
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

test('load resolves each actor profile and reports it', async () => {
  const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const notifications = [{ type: 'like', txid: 'a'.repeat(64), addr }]
  const profileDb = makeProfileMemoDb(notifications, { total: 1 }, {
    [addr]: { name: 'alice', profilePicUrl: 'https://example.com/alice.png' }
  })
  const page = new NotificationsPage({ memoDb: profileDb, wallet: makeWallet() })

  const result = await page.load()

  assert.equal(result.profiles[addr].name, 'alice')
  assert.equal(result.profiles[addr].profilePicUrl, 'https://example.com/alice.png')
})

test('load falls back to an empty profile when the lookup fails', async () => {
  const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const notifications = [{ type: 'like', txid: 'a'.repeat(64), addr }]
  const profileDb = makeProfileMemoDb(notifications, { total: 1 }, { [addr]: { throws: true } })
  const page = new NotificationsPage({ memoDb: profileDb, wallet: makeWallet() })

  const result = await page.load()

  assert.deepEqual(result.profiles[addr], { name: null, profilePicUrl: null })
})

test('getEntries builds view models for every notification', async () => {
  const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const notifications = [
    { type: 'reply', txid: 'a'.repeat(64), addr, postTxid: 'p'.repeat(64), text: 'nice post' },
    { type: 'follow', txid: 'b'.repeat(64), addr: 'bitcoincash:other' }
  ]
  const profileDb = makeProfileMemoDb(notifications, { total: 2 }, {
    [addr]: { name: 'alice', profilePicUrl: 'https://example.com/alice.png' }
  })
  const page = new NotificationsPage({ memoDb: profileDb, wallet: makeWallet() })

  await page.load()
  const entries = page.getEntries()

  assert.equal(entries.length, 2)
  assert.equal(entries[0].displayName, 'alice')
  assert.equal(entries[0].avatarUrl, 'https://example.com/alice.png')
  assert.equal(entries[0].showViewPost, true)
  assert.equal(entries[1].displayName, 'bitcoincash:other')
  assert.equal(entries[1].showViewPost, false)
})

test('getEntryByAddr returns the entry for an actor', async () => {
  const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const notifications = [{ type: 'like', txid: 'a'.repeat(64), addr }]
  const profileDb = makeProfileMemoDb(notifications, { total: 1 }, { [addr]: { name: 'alice' } })
  const page = new NotificationsPage({ memoDb: profileDb, wallet: makeWallet() })

  await page.load()

  assert.equal(page.getEntryByAddr(addr).displayName, 'alice')
  assert.equal(page.getEntryByAddr('bitcoincash:missing'), null)
})
