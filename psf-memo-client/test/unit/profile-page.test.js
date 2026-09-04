/*
  Unit tests for the profile page controller.

  The profile page loads a single address's posts from the MemoDb client and
  fetches the follow state for the viewer. The like count returned by the API
  must be preserved so the view can display it.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const ProfilePage = require('../../src/services/profile-page')

function makeMemoDb (postsByAddr, followState = {}, muteState = {}) {
  return {
    async getPostsByAddr (addr, { limit, offset }) {
      return { posts: postsByAddr[addr] || [], pagination: { total: (postsByAddr[addr] || []).length } }
    },
    async getFollowState (followerAddr, followeeAddr) {
      return followState[`${followerAddr}:${followeeAddr}`] || false
    },
    async getMuteState (muterAddr, muteeAddr) {
      return muteState[`${muterAddr}:${muteeAddr}`] || false
    }
  }
}

function makeMemoFollow (profilePage) {
  return {
    async follow (addr) {
      profilePage.followState = true
    },
    async unfollow (addr) {
      profilePage.followState = false
    }
  }
}

test('load returns posts with like counts for the address', async () => {
  const addr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const posts = [{ txid: 'a'.repeat(64), likeCount: 17 }]
  const page = new ProfilePage({ memoDb: makeMemoDb({ [addr]: posts }), addr })

  const result = await page.load()

  assert.equal(result.posts[0].likeCount, 17)
})

test('getPost returns the like count for a loaded post', async () => {
  const addr = 'bitcoincash:second'
  const posts = [{ txid: 'b'.repeat(64), likeCount: 3 }]
  const page = new ProfilePage({ memoDb: makeMemoDb({ [addr]: posts }), addr })

  await page.load()

  assert.equal(page.getPost('b'.repeat(64)).likeCount, 3)
})

test('load throws when no memo db client is provided', async () => {
  const page = new ProfilePage({ addr: 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d' })

  await assert.rejects(
    () => page.load(),
    /requires a memo db client/
  )
})

test('load throws when no address is provided', async () => {
  const page = new ProfilePage({ memoDb: makeMemoDb({}) })

  await assert.rejects(
    () => page.load(),
    /requires an address/
  )
})

test('load defaults limit to 50 and offset to 0', async () => {
  const calls = []
  const addr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const memoDb = {
    async getPostsByAddr (a, params) {
      calls.push({ a, params })
      return { posts: [], pagination: {} }
    },
    async getFollowState () {
      return false
    }
  }
  const page = new ProfilePage({ memoDb, addr })

  await page.load()

  assert.deepEqual(calls, [{ a: addr, params: { limit: 50, offset: 0 } }])
})

test('load sets pagination to null when the API returns none', async () => {
  const addr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const memoDb = {
    async getPostsByAddr () {
      return { posts: [], pagination: undefined }
    },
    async getFollowState () {
      return false
    }
  }
  const page = new ProfilePage({ memoDb, addr })

  const result = await page.load()

  assert.equal(result.pagination, null)
  assert.equal(page.pagination, null)
})

test('load fetches follow state when a viewer address is provided', async () => {
  const myAddr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const memoDb = makeMemoDb({}, { [`${myAddr}:${addr}`]: true })
  const page = new ProfilePage({ memoDb, addr, myAddr })

  const result = await page.load()

  assert.equal(result.followState, true)
  assert.equal(page.isFollowing(), true)
})

test('isOwnProfile returns true when viewer address matches profile address', () => {
  const addr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const page = new ProfilePage({ memoDb: {}, addr, myAddr: addr })

  assert.equal(page.isOwnProfile(), true)
  assert.equal(page.canFollow(), false)
})

test('canFollow returns true when viewing another profile', () => {
  const myAddr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const page = new ProfilePage({ memoDb: {}, addr, myAddr })

  assert.equal(page.canFollow(), true)
})

test('follow delegates to the memo follow handler and updates state', async () => {
  const myAddr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const memoDb = makeMemoDb({})
  const page = new ProfilePage({ memoDb, addr, myAddr })
  page.memoFollow = makeMemoFollow(page)

  const result = await page.follow()

  assert.equal(result.ok, true)
  assert.equal(page.isFollowing(), true)
})

test('unfollow delegates to the memo follow handler and updates state', async () => {
  const myAddr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const memoDb = makeMemoDb({})
  const page = new ProfilePage({ memoDb, addr, myAddr })
  page.memoFollow = makeMemoFollow(page)
  page.followState = true

  const result = await page.unfollow()

  assert.equal(result.ok, true)
  assert.equal(page.isFollowing(), false)
})

test('constructor preserves an injected memo follow handler', () => {
  const memoFollow = { follow: async () => {}, unfollow: async () => {} }
  const page = new ProfilePage({ memoFollow })

  assert.equal(page.memoFollow, memoFollow)
})

test('follow throws when no memo follow handler is injected', async () => {
  const myAddr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const page = new ProfilePage({ memoDb: makeMemoDb({}), addr, myAddr })

  await assert.rejects(
    () => page.follow(),
    /requires a memo follow handler/
  )
})
