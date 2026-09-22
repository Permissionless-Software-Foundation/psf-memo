/*
  Unit tests for the recent profiles page follow controls.

  The recent profiles page controller loads the viewer's follow state for each
  listed profile. Clicking a row's button opens a confirmation modal that asks
  whether to follow or unfollow the profile's display name; nothing is
  broadcast until Yes is confirmed, and No closes the modal without changing
  the row. Confirming coordinates the follow/unfollow broadcast with an
  injected MemoFollow action. On a broadcast the modal shows loading while the
  broadcast is pending, then either the success message/txid/explorer link or
  the failure message. The modal stays open until dismissed and a failed
  broadcast leaves the button label unchanged.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const RecentProfilesPage = require('../../src/services/recent-profiles-page')
const { makeRecentProfilesMemoDb: makeMemoDb, makeRecordingFollow } = require('../support/recent-profiles')

const DAVE = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const ALICE = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
const SUCCESS_TXID = 'aa'.repeat(32)
const FOLLOW_MESSAGE = 'Your follow was broadcast to the Bitcoin Cash network.'
const UNFOLLOW_MESSAGE = 'Your unfollow was broadcast to the Bitcoin Cash network.'

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

// A loaded page for one profile, named alice by default and optionally already
// followed by the viewer.
async function makeLoadedFollowPage ({ addr = ALICE, name = 'alice', myAddr = DAVE, following = false, memoFollow = makeMemoFollow() } = {}) {
  const page = new RecentProfilesPage({
    memoDb: makeMemoDb([{ addr, name }], following ? { [`${myAddr}:${addr}`]: true } : {}),
    myAddr,
    memoFollow
  })
  await page.load()
  return page
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

test('a new page starts with no result modal, no pending broadcast, and empty follow state', () => {
  const page = new RecentProfilesPage({})

  assert.equal(page.showFollowResultModal, false)
  assert.equal(page.lastFollowResult, null)
  assert.equal(page.followBusyAddr, null)
  assert.deepEqual(page.followState, {})
})

test('load ignores null profiles and profiles without an address', async () => {
  const requested = []
  const memoDb = {
    async getRecentProfiles () {
      return { profiles: [null, { addr: '' }, { addr: ALICE }], pagination: {} }
    },
    async getFollowState (followerAddr, followeeAddr) {
      requested.push(followeeAddr)
      return true
    }
  }
  const page = new RecentProfilesPage({ memoDb, myAddr: DAVE })

  const result = await page.load()

  assert.deepEqual(requested, [ALICE])
  assert.deepEqual(result.followState, { [ALICE]: true })
  assert.equal('' in result.followState, false)
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

test('requestFollow opens a follow confirmation named after the profile', async () => {
  const page = await makeLoadedFollowPage()

  page.requestFollow(ALICE)

  assert.equal(page.showFollowResultModal, true)
  assert.equal(page.getFollowConfirmMessage(), 'Are you sure you want to follow alice?')
  assert.equal(page.lastFollowResult, null)
  assert.equal(page.isFollowing(ALICE), false)
  assert.equal(page.followBusyAddr, null)
})

test('requestFollow opens an unfollow confirmation for a followed profile', async () => {
  const page = await makeLoadedFollowPage({ following: true })

  page.requestFollow(ALICE)

  assert.equal(page.getFollowConfirmMessage(), 'Are you sure you want to unfollow alice?')
})

test('requestFollow uses the truncated address when the profile has no name', async () => {
  const page = await makeLoadedFollowPage({ addr: DAVE, name: null, myAddr: ALICE })

  page.requestFollow(DAVE)

  assert.equal(page.getFollowConfirmMessage(), 'Are you sure you want to follow bitcoincas...py26r63g3d?')
})

test('requestFollow does not broadcast before confirmation', async () => {
  const memoFollow = makeRecordingFollow()
  const page = await makeLoadedFollowPage({ memoFollow })

  page.requestFollow(ALICE)

  assert.equal(memoFollow.calls.length, 0)
  assert.equal(page.isFollowing(ALICE), false)
})

test('getFollowConfirmMessage is empty without a pending confirmation', () => {
  const page = new RecentProfilesPage({})

  assert.equal(page.getFollowConfirmMessage(), '')
})

test('confirmFollow broadcasts the pending follow and records the result', async () => {
  const page = await makeLoadedFollowPage()
  page.requestFollow(ALICE)

  const result = await page.confirmFollow()

  assert.equal(result.ok, true)
  assert.equal(page.isFollowing(ALICE), true)
  assert.equal(page.showFollowResultModal, true)
  assert.equal(page.getFollowConfirmMessage(), '')
  assert.equal(page.getFollowBroadcastMessage(), FOLLOW_MESSAGE)
})

test('confirmFollow broadcasts the pending unfollow', async () => {
  const page = await makeLoadedFollowPage({ following: true })
  page.requestFollow(ALICE)

  await page.confirmFollow()

  assert.equal(page.isFollowing(ALICE), false)
  assert.equal(page.getFollowBroadcastMessage(), UNFOLLOW_MESSAGE)
})

test('confirmFollow throws when there is no pending confirmation', async () => {
  const page = new RecentProfilesPage({ memoDb: makeMemoDb([{ addr: ALICE }]), myAddr: DAVE, memoFollow: makeMemoFollow() })
  await page.load()

  await assert.rejects(() => page.confirmFollow(), /no pending follow/)
})

test('cancelFollow closes the confirmation without broadcasting or changing the row', async () => {
  const memoFollow = makeRecordingFollow()
  const page = await makeLoadedFollowPage({ memoFollow })
  page.requestFollow(ALICE)

  page.cancelFollow()

  assert.equal(memoFollow.calls.length, 0)
  assert.equal(page.showFollowResultModal, false)
  assert.equal(page.getFollowConfirmMessage(), '')
  assert.equal(page.isFollowing(ALICE), false)
})

test('dismissing the follow modal clears any pending confirmation', async () => {
  const page = await makeLoadedFollowPage()
  page.requestFollow(ALICE)

  page.dismissFollowResult()

  assert.equal(page.showFollowResultModal, false)
  assert.equal(page.getFollowConfirmMessage(), '')
})
