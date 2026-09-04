/*
  Unit tests for the recent profiles page controller.

  The recent profiles page is a thin, testable wrapper around the MemoDb client.
  It loads the paginated list of recent profiles and exposes each profile.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const RecentProfilesPage = require('../../src/services/recent-profiles-page')

function makeMemoDb (profiles, pagination) {
  return {
    async getRecentProfiles ({ limit, offset }) {
      return { profiles, pagination }
    }
  }
}

test('load returns profiles and pagination', async () => {
  const profiles = [
    { addr: 'bitcoincash:a', text: 'Alice' },
    { addr: 'bitcoincash:b', text: 'Bob' }
  ]
  const page = new RecentProfilesPage({ memoDb: makeMemoDb(profiles, { total: 2 }) })

  const result = await page.load()

  assert.deepEqual(result.profiles, profiles)
  assert.equal(result.pagination.total, 2)
})

test('load throws when no memo db client is provided', async () => {
  const page = new RecentProfilesPage({})

  await assert.rejects(
    () => page.load(),
    /requires a memo db client/
  )
})

test('load forwards limit and offset to the memo db client', async () => {
  const calls = []
  const memoDb = {
    async getRecentProfiles (params) {
      calls.push(params)
      return { profiles: [], pagination: {} }
    }
  }
  const page = new RecentProfilesPage({ memoDb })

  await page.load({ limit: 10, offset: 20 })

  assert.deepEqual(calls, [{ limit: 10, offset: 20 }])
})

test('load defaults limit to 50 and offset to 0', async () => {
  const calls = []
  const memoDb = {
    async getRecentProfiles (params) {
      calls.push(params)
      return { profiles: [], pagination: {} }
    }
  }
  const page = new RecentProfilesPage({ memoDb })

  await page.load()

  assert.deepEqual(calls, [{ limit: 50, offset: 0 }])
})

test('canLoadMore reflects pagination.hasMore', async () => {
  const pageMore = new RecentProfilesPage({
    memoDb: makeMemoDb([], { hasMore: true })
  })
  await pageMore.load()
  assert.equal(pageMore.canLoadMore(), true)

  const pageDone = new RecentProfilesPage({
    memoDb: makeMemoDb([], { hasMore: false })
  })
  await pageDone.load()
  assert.equal(pageDone.canLoadMore(), false)
})

test('getProfile returns a loaded profile by address', async () => {
  const profiles = [{ addr: 'bitcoincash:a', text: 'Alice' }]
  const page = new RecentProfilesPage({ memoDb: makeMemoDb(profiles, {}) })

  await page.load()

  assert.equal(page.getProfile('bitcoincash:a').text, 'Alice')
})

test('exposes the recent profiles path', () => {
  assert.equal(RecentProfilesPage.RECENT_PROFILES_PATH, '/profile/recent')
})
