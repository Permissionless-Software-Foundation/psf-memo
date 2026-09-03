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

test('load defaults limit to 100 and offset to 0', async () => {
  const calls = []
  const memoDb = {
    async getNotifications (addr, params) {
      calls.push({ addr, params })
      return { notifications: [], pagination: {} }
    }
  }
  const page = new NotificationsPage({ memoDb, wallet: makeWallet() })

  await page.load()

  assert.deepEqual(calls, [{ addr: MY_ADDRESS, params: { limit: 100, offset: 0 } }])
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
