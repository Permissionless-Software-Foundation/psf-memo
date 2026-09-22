/*
  Property tests for the Recent Profiles follow controls.

  The unit tests probe the follow button, result component, and controller at
  fixed fixtures. These properties pin the invariants over broad random inputs:

    - Follow view model: the label is "Unfollow" exactly when the viewer
      follows the row and "Follow" otherwise, the button is disabled exactly on
      the viewer's own row, and the address is preserved.
    - Table mapping: every row's follow view model is derived from that row's
      profile, the viewer address, and the per-address follow map.
    - Result markup: the success body shows the message and links the txid
      exactly when present, the error body shows only the red error, the
      loading body shows the loading indicator, and rendering is deterministic.
    - Controller result state machine: a successful broadcast opens the modal
      with the matching success message, a failure opens the failure modal and
      leaves the row state unchanged, follow then unfollow round-trips, a new
      broadcast replaces the previous result, loading reflects the pending
      broadcast, and dismissing closes the modal without changing the row.
    - Follow-state load conservation: load records exactly one follow-state
      entry per listed profile with a non-empty address.

  All generation is seeded, so runs are reproducible.
*/

'use strict'

const test = require('node:test')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const { seededRandom, forAll, intGen } = require('./harness')
const { makeRecentProfilesMemoDb: makeMemoDb, randomRecentProfileAddr } = require('../support/recent-profiles')
const { randomString, randomWords } = require('../support/random')
const RecentProfilesPage = require('../../src/services/recent-profiles-page')
const {
  buildRecentProfileFollow,
  buildRecentProfilesTable
} = require('../../src/services/recent-profiles-table')
const RecentProfileFollowResult = require('../../src/components/app-body/recent-profiles/recent-profile-follow-result')

const rng = seededRandom(20260922)

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const OTHER_ADDRESS = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
const SUCCESS_TXID = 'ab'.repeat(32)
const FOLLOW_MESSAGE = 'Your follow was broadcast to the Bitcoin Cash network.'
const UNFOLLOW_MESSAGE = 'Your unfollow was broadcast to the Bitcoin Cash network.'

const HEX = '0123456789abcdef'
const SAFE_WORDS = ['follow', 'unfollow', 'broadcast', 'success', 'memo', 'network']

function randomAddr () {
  return randomRecentProfileAddr(rng)
}

function randomTxid () {
  return randomString(rng, HEX, 1, 64)
}

function randomMessage () {
  return randomWords(rng, SAFE_WORDS, 1, 6)
}

function makeFollow (txid = SUCCESS_TXID) {
  return {
    async follow () {
      return txid
    },
    async unfollow () {
      return txid
    }
  }
}

function render (props) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(RecentProfileFollowResult, props)
  )
}

test('buildRecentProfileFollow labels from the follow state and disables only the viewer own row', async () => {
  await forAll(
    () => ({ addr: randomAddr(), myAddr: rng() < 0.5 ? randomAddr() : '', following: rng() < 0.5 }),
    ({ addr, myAddr, following }) => {
      const follow = buildRecentProfileFollow({ addr }, { myAddr, following })
      return follow.addr === addr &&
        follow.label === (following ? 'Unfollow' : 'Follow') &&
        follow.disabled === (Boolean(myAddr) && myAddr === addr)
    },
    { label: 'recent profile follow view model', samples: 2000 }
  )
})

test('buildRecentProfilesTable maps each follow row from its profile and the follow map', async () => {
  await forAll(
    () => {
      const count = intGen(rng, 0, 10)()
      const profiles = Array.from({ length: count }, () => ({ addr: randomAddr() }))
      const myAddr = rng() < 0.5 ? randomAddr() : ''
      const followingByAddr = {}
      for (const profile of profiles) {
        if (rng() < 0.5) followingByAddr[profile.addr] = true
      }
      return { profiles, myAddr, followingByAddr }
    },
    ({ profiles, myAddr, followingByAddr }) => {
      const table = buildRecentProfilesTable(profiles, { myAddr, followingByAddr })
      if (table.rows.length !== profiles.length) return false
      return table.rows.every((row, i) => {
        const expected = buildRecentProfileFollow(profiles[i], {
          myAddr,
          following: followingByAddr[profiles[i].addr] === true
        })
        return JSON.stringify(row.follow) === JSON.stringify(expected)
      })
    },
    { label: 'recent profiles follow table mapping', samples: 800 }
  )
})

test('RecentProfileFollowResult shows the message and links the txid exactly when present', async () => {
  await forAll(
    () => ({ txid: rng() < 0.2 ? '' : randomTxid(), message: randomMessage() }),
    ({ txid, message }) => {
      const explorerUrl = txid ? `https://bch.loping.net/tx/${txid}` : ''
      const html = render({ txid, message, explorerUrl })
      if (!html.includes(message)) return false
      if (txid) {
        return html.includes(txid) &&
          html.includes(`href="${explorerUrl}"`) &&
          html.includes('target="_blank"')
      }
      return !html.includes('<a ')
    },
    { label: 'recent profile follow result markup', samples: 1500 }
  )
})

test('RecentProfileFollowResult shows only the red error when an error is present', async () => {
  await forAll(
    () => ({ txid: randomTxid(), message: randomMessage(), error: randomMessage() }),
    ({ txid, message, error }) => {
      const html = render({ txid, message, error, explorerUrl: `https://bch.loping.net/tx/${txid}` })
      return html.includes('recent-profile-follow-error') &&
        html.includes(error) &&
        !html.includes('recent-profile-follow-message') &&
        !html.includes('<a ')
    },
    { label: 'recent profile follow error markup', samples: 1000 }
  )
})

test('RecentProfileFollowResult shows the loading indicator instead of the message while pending', async () => {
  await forAll(
    () => ({ txid: randomTxid(), message: randomMessage() }),
    ({ txid, message }) => {
      const html = render({ txid, message, explorerUrl: `https://bch.loping.net/tx/${txid}`, loading: true })
      return html.includes('recent-profile-follow-loading') && !html.includes('recent-profile-follow-message')
    },
    { label: 'recent profile follow loading markup', samples: 800 }
  )
})

test('rendering the same RecentProfileFollowResult props twice yields the same markup', async () => {
  await forAll(
    () => ({ txid: randomTxid(), message: randomMessage() }),
    (props) => {
      const first = render(props)
      const second = render(props)
      return first === second
    },
    { label: 'recent profile follow render determinism', samples: 500 }
  )
})

test('the follow result modal mirrors the last broadcast outcome', async () => {
  await forAll(
    () => ({ action: rng() < 0.5 ? 'follow' : 'unfollow', fail: rng() < 0.4 }),
    async ({ action, fail }) => {
      const page = new RecentProfilesPage({
        memoDb: makeMemoDb([{ addr: OTHER_ADDRESS }]),
        myAddr: MY_ADDRESS,
        memoFollow: fail
          ? {
              async follow () { throw new Error('Insufficient balance') },
              async unfollow () { throw new Error('Insufficient balance') }
            }
          : makeFollow()
      })
      await page.load()
      const result = await page[action](OTHER_ADDRESS)

      if (!page.showFollowResultModal) return false
      if (result.ok) {
        const expected = action === 'unfollow' ? UNFOLLOW_MESSAGE : FOLLOW_MESSAGE
        return page.getFollowBroadcastMessage() === expected && page.getFollowResultError() === ''
      }
      return page.getFollowBroadcastMessage() === '' && page.getFollowResultError() === 'Insufficient balance'
    },
    { label: 'recent profile follow modal outcome', samples: 800 }
  )
})

test('a failed follow broadcast leaves the row follow state unchanged', async () => {
  await forAll(
    () => ({ action: rng() < 0.5 ? 'follow' : 'unfollow', initial: rng() < 0.5 }),
    async ({ action, initial }) => {
      const page = new RecentProfilesPage({
        memoDb: makeMemoDb([{ addr: OTHER_ADDRESS }]),
        myAddr: MY_ADDRESS,
        memoFollow: {
          async follow () { throw new Error('Insufficient balance') },
          async unfollow () { throw new Error('Insufficient balance') }
        }
      })
      await page.load()
      page.followState[OTHER_ADDRESS] = initial
      const result = await page[action](OTHER_ADDRESS)
      return result.ok === false && page.isFollowing(OTHER_ADDRESS) === initial
    },
    { label: 'recent profile follow failure leaves row state', samples: 500 }
  )
})

test('a successful follow then unfollow round-trips the row follow state', async () => {
  await forAll(
    () => rng() < 0.5,
    async (startFollowing) => {
      const page = new RecentProfilesPage({
        memoDb: makeMemoDb([{ addr: OTHER_ADDRESS }]),
        myAddr: MY_ADDRESS,
        memoFollow: makeFollow()
      })
      await page.load()
      page.followState[OTHER_ADDRESS] = startFollowing
      const followResult = await page.follow(OTHER_ADDRESS)
      const afterFollow = page.isFollowing(OTHER_ADDRESS)
      const unfollowResult = await page.unfollow(OTHER_ADDRESS)
      const afterUnfollow = page.isFollowing(OTHER_ADDRESS)
      return followResult.ok && afterFollow === true && unfollowResult.ok && afterUnfollow === false
    },
    { label: 'recent profile follow reflected state round trip', samples: 400 }
  )
})

test('a new follow broadcast replaces the previous result', async () => {
  await forAll(
    () => rng() < 0.5,
    async (firstFails) => {
      const page = new RecentProfilesPage({
        memoDb: makeMemoDb([{ addr: OTHER_ADDRESS }]),
        myAddr: MY_ADDRESS,
        memoFollow: firstFails
          ? { async follow () { throw new Error('Insufficient balance') }, async unfollow () { return SUCCESS_TXID } }
          : makeFollow()
      })
      await page.load()
      await page.follow(OTHER_ADDRESS)
      const before = { ok: page.lastFollowResult.ok, error: page.getFollowResultError() }
      page.memoFollow = {
        async follow () {
          if (!firstFails) throw new Error('Insufficient balance')
          return SUCCESS_TXID
        },
        async unfollow () {
          return SUCCESS_TXID
        }
      }
      await page.follow(OTHER_ADDRESS)
      return before.ok === !firstFails &&
        page.lastFollowResult.ok === firstFails &&
        page.getFollowResultError() === (firstFails ? '' : 'Insufficient balance')
    },
    { label: 'recent profile follow result replace', samples: 400 }
  )
})

test('the follow result reports loading only while the broadcast is pending', async () => {
  await forAll(
    () => randomAddr(),
    async (addr) => {
      let release
      const gate = new Promise((resolve) => { release = resolve })
      const page = new RecentProfilesPage({
        memoDb: makeMemoDb([{ addr }]),
        myAddr: MY_ADDRESS,
        memoFollow: {
          async follow () {
            await gate
            return SUCCESS_TXID
          },
          async unfollow () {
            await gate
            return SUCCESS_TXID
          }
        }
      })
      await page.load()
      const pending = page.follow(addr)
      const loadingWhilePending = page.isFollowLoading(addr) && !page.isFollowLoading(MY_ADDRESS)
      release()
      await pending
      return loadingWhilePending && !page.isFollowLoading(addr)
    },
    { label: 'recent profile follow loading', samples: 300 }
  )
})

test('dismissing the follow result closes the modal without changing the row', async () => {
  await forAll(
    () => ({ action: rng() < 0.5 ? 'follow' : 'unfollow', fail: rng() < 0.5 }),
    async ({ action, fail }) => {
      const page = new RecentProfilesPage({
        memoDb: makeMemoDb([{ addr: OTHER_ADDRESS }]),
        myAddr: MY_ADDRESS,
        memoFollow: fail
          ? { async follow () { throw new Error('Insufficient balance') }, async unfollow () { throw new Error('Insufficient balance') } }
          : makeFollow()
      })
      await page.load()
      const result = await page[action](OTHER_ADDRESS)
      const stateBeforeDismiss = page.isFollowing(OTHER_ADDRESS)
      page.dismissFollowResult()
      return result.ok === !fail &&
        page.showFollowResultModal === false &&
        page.isFollowing(OTHER_ADDRESS) === stateBeforeDismiss
    },
    { label: 'recent profile follow result dismiss', samples: 500 }
  )
})

test('load records one follow-state entry per profile with a non-empty address', async () => {
  await forAll(
    () => {
      const count = intGen(rng, 0, 10)()
      const profiles = Array.from({ length: count }, () => (rng() < 0.15 ? { addr: '' } : { addr: randomAddr() }))
      const followState = {}
      for (const profile of profiles) {
        if (profile.addr) followState[`${MY_ADDRESS}:${profile.addr}`] = rng() < 0.5
      }
      return { profiles, followState }
    },
    async ({ profiles, followState }) => {
      const page = new RecentProfilesPage({ memoDb: makeMemoDb(profiles, followState), myAddr: MY_ADDRESS })
      const result = await page.load()
      const loadedAddrs = Object.keys(result.followState).sort()
      const expectedAddrs = profiles.filter((profile) => profile.addr).map((profile) => profile.addr).sort()
      if (JSON.stringify(loadedAddrs) !== JSON.stringify(expectedAddrs)) return false
      return expectedAddrs.every((addr) => result.followState[addr] === (followState[`${MY_ADDRESS}:${addr}`] || false))
    },
    { label: 'recent profile follow state load conservation', samples: 600 }
  )
})
