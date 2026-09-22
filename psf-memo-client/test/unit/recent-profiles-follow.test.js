/*
  Unit tests for the recent profiles page follow controls.

  The recent profiles page controller loads the viewer's follow state for each
  listed profile and coordinates follow/unfollow broadcasts with an injected
  MemoFollow action. On a broadcast it opens a result modal that shows loading
  while the broadcast is pending, then either the success message/txid/explorer
  link or the failure message. The modal stays open until dismissed and a
  failed broadcast leaves the button label unchanged.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const RecentProfilesPage = require('../../src/services/recent-profiles-page')

const DAVE = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const ALICE = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
const SUCCESS_TXID = 'aa'.repeat(32)
const FOLLOW_MESSAGE = 'Your follow was broadcast to the Bitcoin Cash network.'
const UNFOLLOW_MESSAGE = 'Your unfollow was broadcast to the Bitcoin Cash network.'

function makeMemoDb (profiles = [], followState = {}) {
  return {
    async getRecentProfiles () {
      return { profiles, pagination: { total: profiles.length } }
    },
    async getFollowState (followerAddr, followeeAddr) {
      return followState[`${followerAddr}:${followeeAddr}`] || false
    }
  }
}

function makeMemoFollow (txid = SUCCESS_TXID) {
  return {
    async follow () {
      return txid
    },
    async unfollow () {
      return txid
    }
  }
}

test('load fetches the follow state for each listed profile', async () => {
  const profiles = [{ addr: ALICE }, { addr: DAVE }]
  const memoDb = makeMemoDb(profiles, { [`${DAVE}:${ALICE}`]: true })
  const page = new RecentProfilesPage({ memoDb, myAddr: DAVE })

  const result = await page.load()

  assert.equal(result.followState[ALICE], true)
  assert.equal(result.followState[DAVE], false)
  assert.equal(page.isFollowing(ALICE), true)
  assert.equal(page.isFollowing(DAVE), false)
})

test('load does not fetch follow state without a viewer address', async () => {
  let calls = 0
  const memoDb = {
    async getRecentProfiles () {
      return { profiles: [{ addr: ALICE }], pagination: {} }
    },
    async getFollowState () {
      calls++
      return true
    }
  }
  const page = new RecentProfilesPage({ memoDb })

  await page.load()

  assert.equal(calls, 0)
  assert.equal(page.isFollowing(ALICE), false)
})

test('follow delegates to the memo follow handler and flips the row', async () => {
  const page = new RecentProfilesPage({ memoDb: makeMemoDb([{ addr: ALICE }]), myAddr: DAVE, memoFollow: makeMemoFollow() })
  await page.load()

  const result = await page.follow(ALICE)

  assert.equal(result.ok, true)
  assert.equal(result.txid, SUCCESS_TXID)
  assert.equal(page.isFollowing(ALICE), true)
  assert.equal(page.showFollowResultModal, true)
  assert.equal(page.getFollowBroadcastMessage(), FOLLOW_MESSAGE)
  assert.equal(page.explorerUrl(SUCCESS_TXID), `https://bch.loping.net/tx/${SUCCESS_TXID}`)
})

test('unfollow delegates to the memo follow handler and flips the row', async () => {
  const page = new RecentProfilesPage({
    memoDb: makeMemoDb([{ addr: ALICE }], { [`${DAVE}:${ALICE}`]: true }),
    myAddr: DAVE,
    memoFollow: makeMemoFollow()
  })
  await page.load()

  const result = await page.unfollow(ALICE)

  assert.equal(result.ok, true)
  assert.equal(page.isFollowing(ALICE), false)
  assert.equal(page.getFollowBroadcastMessage(), UNFOLLOW_MESSAGE)
})

test('follow throws when no memo follow handler is injected', async () => {
  const page = new RecentProfilesPage({ memoDb: makeMemoDb([{ addr: ALICE }]), myAddr: DAVE })
  await page.load()

  await assert.rejects(() => page.follow(ALICE), /requires a memo follow handler/)
})

test('a failed follow records the error, opens the failure modal, and keeps the button label', async () => {
  const page = new RecentProfilesPage({
    memoDb: makeMemoDb([{ addr: ALICE }]),
    myAddr: DAVE,
    memoFollow: {
      async follow () {
        throw new Error('Insufficient balance')
      },
      async unfollow () {
        return SUCCESS_TXID
      }
    }
  })
  await page.load()

  const result = await page.follow(ALICE)

  assert.equal(result.ok, false)
  assert.equal(page.isFollowing(ALICE), false)
  assert.equal(page.showFollowResultModal, true)
  assert.equal(page.getFollowResultError(), 'Insufficient balance')
  assert.equal(page.getFollowBroadcastMessage(), '')
})

test('the result modal reports loading while the broadcast is pending', async () => {
  let release
  const gate = new Promise((resolve) => { release = resolve })
  const page = new RecentProfilesPage({
    memoDb: makeMemoDb([{ addr: ALICE }]),
    myAddr: DAVE,
    memoFollow: {
      async follow () {
        await gate
        return SUCCESS_TXID
      },
      async unfollow () {
        return SUCCESS_TXID
      }
    }
  })
  await page.load()

  const pending = page.follow(ALICE)

  assert.equal(page.showFollowResultModal, true)
  assert.equal(page.isFollowLoading(ALICE), true)
  assert.equal(page.isFollowLoading(DAVE), false)

  release()
  await pending

  assert.equal(page.isFollowLoading(ALICE), false)
  assert.equal(page.isFollowing(ALICE), true)
  assert.equal(page.getFollowBroadcastMessage(), FOLLOW_MESSAGE)
})

test('getFollowResultError is empty without a result', () => {
  const page = new RecentProfilesPage({})

  assert.equal(page.getFollowResultError(), '')
  assert.equal(page.getFollowBroadcastMessage(), '')
})

test('dismissing the follow result closes the modal without changing the row', async () => {
  const page = new RecentProfilesPage({
    memoDb: makeMemoDb([{ addr: ALICE }]),
    myAddr: DAVE,
    memoFollow: makeMemoFollow()
  })
  await page.load()
  await page.follow(ALICE)

  page.dismissFollowResult()

  assert.equal(page.showFollowResultModal, false)
  assert.equal(page.isFollowing(ALICE), true)
})

test('getProfile still returns a loaded profile by address', async () => {
  const page = new RecentProfilesPage({ memoDb: makeMemoDb([{ addr: ALICE, text: 'Alice' }]), myAddr: DAVE })
  await page.load()

  assert.equal(page.getProfile(ALICE).text, 'Alice')
})
