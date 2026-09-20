/*
  Unit tests for the merged posts feed page controller.

  FeedTabsPage merges the recent feed and the following feed behind a row of
  two mode buttons ("Recent" / "Following"). It selects the default mode from
  the viewer's follow state, delegates loading to the recent/following page
  controllers, and resets to the first page whenever the tab changes.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const FeedTabsPage = require('../../src/services/feed-tabs-page')

const MY = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const ALICE = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'

function makeWallet (address = MY) {
  return { walletInfo: { cashAddress: address } }
}

function makeMemoDb ({
  following = [],
  recent = { posts: [], pagination: { total: 0, limit: 50, offset: 0, hasMore: false } },
  followingFeed = { posts: [], pagination: { total: 0, limit: 50, offset: 0, hasMore: false } }
} = {}) {
  const calls = { getFollowing: [], getRecentPosts: [], getFollowingFeed: [] }
  return {
    calls,
    async getFollowing (addr) {
      calls.getFollowing.push(addr)
      return following
    },
    async getRecentPosts (opts) {
      calls.getRecentPosts.push(opts)
      return recent
    },
    async getFollowingFeed (addr, opts) {
      calls.getFollowingFeed.push({ addr, opts })
      return followingFeed
    }
  }
}

// Build a page whose selected feed holds exactly one post, open it, and
// return the page, its memo-db spy, and the post. The two default-mode tests
// differ only in which feed holds the post.
async function openWithOnePost ({ following, feed, key }) {
  const post = { txid: key.repeat(64), text: key }
  const memoDb = makeMemoDb({
    following,
    [feed]: { posts: [post], pagination: { total: 1, limit: 50, offset: 0, hasMore: false } }
  })
  const page = new FeedTabsPage({ memoDb, wallet: makeWallet() })
  await page.open()
  return { page, memoDb, post }
}

test('exposes the Recent and Following tabs in order', () => {
  const page = new FeedTabsPage({ memoDb: makeMemoDb(), wallet: makeWallet() })
  assert.deepEqual(page.tabs, ['Recent', 'Following'])
})

test('open selects Following and loads followed posts when the viewer follows an account', async () => {
  const { page, memoDb, post } = await openWithOnePost({ following: [ALICE], feed: 'followingFeed', key: 'a' })

  assert.equal(page.isFollowing(), true)
  assert.equal(page.isRecent(), false)
  assert.deepEqual(page.posts, [post])
  assert.equal(memoDb.calls.getFollowing.length, 1)
  assert.equal(memoDb.calls.getRecentPosts.length, 0)
  assert.equal(memoDb.calls.getFollowingFeed.length, 1)
})

test('open selects Recent and loads recent posts when the viewer follows no one', async () => {
  const { page, memoDb, post } = await openWithOnePost({ following: [], feed: 'recent', key: 'b' })

  assert.equal(page.isRecent(), true)
  assert.equal(page.isFollowing(), false)
  assert.deepEqual(page.posts, [post])
  assert.equal(memoDb.calls.getRecentPosts.length, 1)
  assert.equal(memoDb.calls.getFollowingFeed.length, 0)
})

test('open asks the memo db which accounts the viewer follows', async () => {
  const memoDb = makeMemoDb({ following: [ALICE] })
  const page = new FeedTabsPage({ memoDb, wallet: makeWallet() })

  await page.open()

  assert.deepEqual(memoDb.calls.getFollowing, [MY])
})

test('open forwards the page size and offset to the selected feed', async () => {
  const memoDb = makeMemoDb({ following: [] })
  const page = new FeedTabsPage({ memoDb, wallet: makeWallet() })

  await page.open({ limit: 2, offset: 4 })

  assert.deepEqual(memoDb.calls.getRecentPosts, [{ limit: 2, offset: 4, viewer: MY }])
})

test('open forwards the page size to the following feed when the viewer follows an account', async () => {
  const memoDb = makeMemoDb({ following: [ALICE] })
  const page = new FeedTabsPage({ memoDb, wallet: makeWallet() })

  await page.open({ limit: 2, offset: 0 })

  assert.deepEqual(memoDb.calls.getFollowingFeed, [{ addr: MY, opts: { limit: 2, offset: 0 } }])
})

test('open selects Recent and skips the follow lookup when no wallet is available', async () => {
  const memoDb = makeMemoDb({ following: [ALICE] })
  const page = new FeedTabsPage({ memoDb, wallet: null })

  await page.open()

  assert.equal(page.isRecent(), true)
  assert.deepEqual(memoDb.calls.getFollowing, [])
})

test('open throws when no memo db client is provided', async () => {
  const page = new FeedTabsPage({})

  await assert.rejects(() => page.open(), /requires a memo db client/)
})

test('selectTab Recent switches from Following and resets to the first page', async () => {
  const memoDb = makeMemoDb({ following: [ALICE] })
  const page = new FeedTabsPage({ memoDb, wallet: makeWallet() })

  await page.open({ limit: 2 })
  page.offset = 6
  await page.selectTab('Recent')

  assert.equal(page.isRecent(), true)
  assert.equal(page.offset, 0)
  assert.deepEqual(memoDb.calls.getRecentPosts, [{ limit: 2, offset: 0, viewer: MY }])
})

test('selectTab Following switches from Recent and resets to the first page', async () => {
  const memoDb = makeMemoDb({ following: [ALICE] })
  const page = new FeedTabsPage({ memoDb, wallet: makeWallet() })

  await page.open({ limit: 2 })
  await page.selectTab('Recent')
  page.offset = 4
  await page.selectTab('Following')

  assert.equal(page.isFollowing(), true)
  assert.equal(page.offset, 0)
  assert.deepEqual(memoDb.calls.getFollowingFeed[1], { addr: MY, opts: { limit: 2, offset: 0 } })
})

test('selecting the already active tab does not reload', async () => {
  const memoDb = makeMemoDb({ following: [] })
  const page = new FeedTabsPage({ memoDb, wallet: makeWallet() })

  await page.open()
  await page.selectTab('Recent')

  assert.equal(memoDb.calls.getRecentPosts.length, 1)
})

test('selectTab rejects an unknown tab name', async () => {
  const memoDb = makeMemoDb({ following: [] })
  const page = new FeedTabsPage({ memoDb, wallet: makeWallet() })

  await page.open()

  await assert.rejects(() => page.selectTab('Topics'), /Unknown feed tab: Topics/)
})

test('Following tab with no followees shows the not-following-anyone message', async () => {
  const memoDb = makeMemoDb({ following: [] })
  const page = new FeedTabsPage({ memoDb, wallet: makeWallet() })

  await page.open()
  await page.selectTab('Following')

  assert.equal(page.posts.length, 0)
  assert.equal(page.emptyBecauseNoFollows, true)
})

test('Following tab with followees but no posts does not show the not-following-anyone message', async () => {
  const memoDb = makeMemoDb({
    following: [ALICE],
    followingFeed: { posts: [], pagination: { total: 0, limit: 50, offset: 0, hasMore: false } }
  })
  const page = new FeedTabsPage({ memoDb, wallet: makeWallet() })

  await page.open()

  assert.equal(page.isFollowing(), true)
  assert.equal(page.posts.length, 0)
  assert.equal(page.emptyBecauseNoFollows, false)
})

test('Recent tab never shows the not-following-anyone message', async () => {
  const memoDb = makeMemoDb({ following: [] })
  const page = new FeedTabsPage({ memoDb, wallet: makeWallet() })

  await page.open()

  assert.equal(page.emptyBecauseNoFollows, false)
})

test('canLoadMore reflects the pagination hasMore flag', async () => {
  const memoDb = makeMemoDb({
    following: [],
    recent: { posts: [{ txid: 'c'.repeat(64), text: 'one' }], pagination: { total: 3, limit: 2, offset: 0, hasMore: true } }
  })
  const page = new FeedTabsPage({ memoDb, wallet: makeWallet() })

  await page.open({ limit: 2 })

  assert.equal(page.canLoadMore(), true)
})

test('nextPage advances the offset by the page size and loads the next page', async () => {
  const memoDb = makeMemoDb({ following: [] })
  memoDb.getRecentPosts = async (opts) => {
    memoDb.calls.getRecentPosts.push(opts)
    return { posts: opts.offset === 0 ? [{ txid: 'c'.repeat(64), text: 'one' }] : [], pagination: { total: 1, limit: opts.limit, offset: opts.offset, hasMore: opts.offset === 0 } }
  }
  const page = new FeedTabsPage({ memoDb, wallet: makeWallet() })

  await page.open({ limit: 2 })
  await page.nextPage()

  assert.equal(page.offset, 2)
  assert.deepEqual(memoDb.calls.getRecentPosts[1], { limit: 2, offset: 2, viewer: MY })
})

test('nextPage does nothing when there are no more posts', async () => {
  const memoDb = makeMemoDb({ following: [] })
  const page = new FeedTabsPage({ memoDb, wallet: makeWallet() })

  await page.open({ limit: 2 })
  await page.nextPage()

  assert.equal(page.offset, 0)
  assert.equal(memoDb.calls.getRecentPosts.length, 1)
})

test('previousPage moves back a page and never before the first page', async () => {
  const memoDb = makeMemoDb({ following: [] })
  const page = new FeedTabsPage({ memoDb, wallet: makeWallet() })

  await page.open({ limit: 2 })
  page.offset = 4
  await page.previousPage()
  await page.previousPage()
  await page.previousPage()

  assert.equal(page.offset, 0)
})

test('getPost returns a loaded post by txid', async () => {
  const post = { txid: 'd'.repeat(64), text: 'hello' }
  const memoDb = makeMemoDb({
    following: [],
    recent: { posts: [post], pagination: { total: 1, limit: 50, offset: 0, hasMore: false } }
  })
  const page = new FeedTabsPage({ memoDb, wallet: makeWallet() })

  await page.open()

  assert.equal(page.getPost(post.txid), post)
  assert.equal(page.getPost('e'.repeat(64)), null)
})
