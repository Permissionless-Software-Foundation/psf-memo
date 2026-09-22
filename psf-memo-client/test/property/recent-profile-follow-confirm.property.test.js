/*
  Property tests for the Recent Profiles follow confirmation flow.

  The unit tests probe requestFollow/confirmFollow/cancelFollow at fixed
  fixtures. These properties pin the confirmation invariants over broad random
  profiles and follow states:

    - Prompt: requestFollow opens a confirmation whose action matches the row's
      current follow state and whose display name matches the Account column
      (the profile name, or the truncated address when absent). Nothing is
      broadcast before confirmation.
    - Cancel: cancelFollow never broadcasts and leaves the row follow state
      unchanged, with no pending confirmation left behind.
    - Confirm: confirmFollow broadcasts exactly the requested action once,
      flips the row to the matching state, and clears the confirmation.
    - No pending: confirming without a request rejects and broadcasts nothing;
      dismissing the modal clears any pending confirmation.
    - Markup: the confirmation body shows the prompt and both Yes and No
      buttons, and rendering is deterministic.

  All generation is seeded, so runs are reproducible.
*/

'use strict'

const test = require('node:test')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const { seededRandom, forAll } = require('./harness')
const {
  makeRecentProfilesMemoDb: makeMemoDb,
  randomRecentProfileAddr,
  makeRecordingFollow
} = require('../support/recent-profiles')
const { randomWords } = require('../support/random')
const RecentProfilesPage = require('../../src/services/recent-profiles-page')
const { accountDisplayName } = require('../../src/services/recent-profiles-table')
const RecentProfileFollowConfirm = require('../../src/components/app-body/recent-profiles/recent-profile-follow-confirm')

const rng = seededRandom(20260922)

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

const SAFE_WORDS = ['alice', 'bob', 'carol', 'dave', 'follow', 'unfollow']

function randomAddr () {
  return randomRecentProfileAddr(rng)
}

function randomDisplayName () {
  return randomWords(rng, SAFE_WORDS, 1, 4)
}

function renderConfirm (props) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(RecentProfileFollowConfirm, props)
  )
}

test('requestFollow opens a confirmation matching the row action and display name', async () => {
  await forAll(
    () => ({ addr: randomAddr(), name: rng() < 0.5 ? randomDisplayName() : null, following: rng() < 0.5 }),
    async ({ addr, name, following }) => {
      const memoFollow = makeRecordingFollow()
      const page = new RecentProfilesPage({
        memoDb: makeMemoDb([{ addr, name }], { [`${MY_ADDRESS}:${addr}`]: following }),
        myAddr: MY_ADDRESS,
        memoFollow
      })
      await page.load()

      const pending = page.requestFollow(addr)
      const action = following ? 'unfollow' : 'follow'
      const displayName = accountDisplayName(addr, name)

      return memoFollow.calls.length === 0 &&
        pending.action === action &&
        pending.addr === addr &&
        pending.displayName === displayName &&
        page.getFollowConfirmMessage() === `Are you sure you want to ${action} ${displayName}?` &&
        page.showFollowResultModal === true &&
        page.lastFollowResult === null &&
        page.followBusyAddr === null &&
        page.isFollowing(addr) === following
    },
    { label: 'recent profile follow confirmation prompt', samples: 1000 }
  )
})

test('cancelling a follow confirmation never broadcasts and leaves the row unchanged', async () => {
  await forAll(
    () => ({ addr: randomAddr(), following: rng() < 0.5 }),
    async ({ addr, following }) => {
      const memoFollow = makeRecordingFollow()
      const page = new RecentProfilesPage({
        memoDb: makeMemoDb([{ addr, name: 'alice' }], { [`${MY_ADDRESS}:${addr}`]: following }),
        myAddr: MY_ADDRESS,
        memoFollow
      })
      await page.load()

      page.requestFollow(addr)
      const returned = page.cancelFollow()
      page.cancelFollow()

      return memoFollow.calls.length === 0 &&
        returned === page &&
        page.pendingFollow === null &&
        page.getFollowConfirmMessage() === '' &&
        page.showFollowResultModal === false &&
        page.isFollowing(addr) === following
    },
    { label: 'recent profile follow confirmation cancel', samples: 600 }
  )
})

test('confirming broadcasts exactly the requested action once and flips the row', async () => {
  await forAll(
    () => ({ addr: randomAddr(), following: rng() < 0.5 }),
    async ({ addr, following }) => {
      const memoFollow = makeRecordingFollow()
      const page = new RecentProfilesPage({
        memoDb: makeMemoDb([{ addr, name: 'alice' }], { [`${MY_ADDRESS}:${addr}`]: following }),
        myAddr: MY_ADDRESS,
        memoFollow
      })
      await page.load()

      page.requestFollow(addr)
      const result = await page.confirmFollow()
      const expectedMethod = following ? 'unfollow' : 'follow'

      return memoFollow.calls.length === 1 &&
        memoFollow.calls[0].method === expectedMethod &&
        memoFollow.calls[0].addr === addr &&
        result.ok === true &&
        result.action === expectedMethod &&
        page.isFollowing(addr) === (expectedMethod === 'follow') &&
        page.pendingFollow === null &&
        page.getFollowConfirmMessage() === ''
    },
    { label: 'recent profile follow confirmation broadcast', samples: 600 }
  )
})

test('confirming a failed confirmed broadcast leaves the row unchanged', async () => {
  await forAll(
    () => ({ addr: randomAddr(), following: rng() < 0.5 }),
    async ({ addr, following }) => {
      const memoFollow = makeRecordingFollow({ fail: true })
      const page = new RecentProfilesPage({
        memoDb: makeMemoDb([{ addr, name: 'alice' }], { [`${MY_ADDRESS}:${addr}`]: following }),
        myAddr: MY_ADDRESS,
        memoFollow
      })
      await page.load()

      page.requestFollow(addr)
      const result = await page.confirmFollow()

      return result.ok === false &&
        memoFollow.calls.length === 1 &&
        page.isFollowing(addr) === following &&
        page.pendingFollow === null &&
        page.getFollowResultError() === 'Insufficient balance'
    },
    { label: 'recent profile follow confirmation failure', samples: 500 }
  )
})

test('confirming without a pending confirmation rejects and broadcasts nothing', async () => {
  await forAll(
    () => randomAddr(),
    async (addr) => {
      const memoFollow = makeRecordingFollow()
      const page = new RecentProfilesPage({
        memoDb: makeMemoDb([{ addr, name: 'alice' }]),
        myAddr: MY_ADDRESS,
        memoFollow
      })
      await page.load()

      let threw = false
      try {
        await page.confirmFollow()
      } catch (err) {
        threw = /no pending follow/.test(err.message)
      }
      return threw && memoFollow.calls.length === 0
    },
    { label: 'recent profile follow confirmation without pending', samples: 300 }
  )
})

test('dismissing the follow modal clears any pending confirmation', async () => {
  await forAll(
    () => randomAddr(),
    async (addr) => {
      const memoFollow = makeRecordingFollow()
      const page = new RecentProfilesPage({
        memoDb: makeMemoDb([{ addr, name: 'alice' }]),
        myAddr: MY_ADDRESS,
        memoFollow
      })
      await page.load()
      page.requestFollow(addr)
      page.dismissFollowResult()

      return page.pendingFollow === null &&
        page.showFollowResultModal === false &&
        page.getFollowConfirmMessage() === ''
    },
    { label: 'recent profile follow confirmation dismiss', samples: 400 }
  )
})

test('RecentProfileFollowConfirm shows the prompt and both buttons', async () => {
  await forAll(
    () => randomDisplayName(),
    (message) => {
      const html = renderConfirm({ message })
      return html.includes(message) &&
        html.includes('recent-profile-follow-confirm-message') &&
        /<button[^>]*>Yes<\/button>/.test(html) &&
        /<button[^>]*>No<\/button>/.test(html)
    },
    { label: 'recent profile follow confirm markup', samples: 600 }
  )
})

test('rendering the same RecentProfileFollowConfirm props twice yields the same markup', async () => {
  await forAll(
    () => randomDisplayName(),
    (message) => {
      const first = renderConfirm({ message })
      const second = renderConfirm({ message })
      return first === second
    },
    { label: 'recent profile follow confirm render determinism', samples: 400 }
  )
})
