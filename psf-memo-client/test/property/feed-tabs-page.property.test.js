/*
  Property tests for the merged FeedTabsPage controller.

  The unit tests probe a few fixed tab/pagination shapes. These properties
  cover the mode-selection, delegation, tab-switch, paging, and empty-state
  invariants over broad random inputs so they hold everywhere:

    - default mode: open selects Following exactly when the viewer has an
      address and follows at least one account, otherwise Recent, and loads
      exactly the selected feed once.
    - forwarding: the requested limit and offset reach the selected feed.
    - tab switch: selecting a different tab resets the offset to the first
      page; selecting the active tab reloads nothing.
    - paging: nextPage advances by one page only when more pages exist;
      previousPage never moves before the first page.
    - empty state: emptyBecauseNoFollows is true exactly for an empty
      Following tab when the viewer follows no one.
    - state/lookup: getState mirrors the controller and getPost finds a
      loaded post by txid and returns null otherwise.
    - scroll reset: every completed page load requests exactly one scroll to
      the top through the injected adapter, and no-op actions request none, so
      the scroll-request count equals the number of successful feed loads.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen } = require('./harness')
const FeedTabsPage = require('../../src/services/feed-tabs-page')

const rng = seededRandom(20260920)

const MY = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const ADDRESSES = [
  'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy',
  'bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r',
  'bitcoincash:qzlg6uvceehgzgtz6phmvy8gtdqyt6vf3uqpvqp4d8'
]
const HEX = '0123456789abcdef'

function txidGen () {
  let out = ''
  for (let i = 0; i < 64; i++) {
    out += HEX[Math.floor(rng() * HEX.length)]
  }
  return out
}

function feedGen () {
  const n = intGen(rng, 0, 4)()
  const posts = []
  for (let i = 0; i < n; i++) {
    posts.push({ txid: txidGen(), text: 'post ' + i })
  }
  return {
    posts,
    pagination: { total: n, limit: 50, offset: 0, hasMore: rng() < 0.5 }
  }
}

function scenarioGen () {
  return () => {
    const hasWallet = rng() < 0.8
    const followCount = intGen(rng, 0, ADDRESSES.length)()
    const following = ADDRESSES.slice(0, followCount)
    return {
      wallet: hasWallet ? { walletInfo: { cashAddress: MY } } : null,
      following,
      recent: feedGen(),
      followingFeed: feedGen(),
      limit: intGen(rng, 1, 100)(),
      offset: intGen(rng, 0, 200)()
    }
  }
}

function makeHarness (scenario) {
  const calls = { getFollowing: [], getRecentPosts: [], getFollowingFeed: [] }
  const scroll = { count: 0 }
  const memoDb = {
    async getFollowing (addr) {
      calls.getFollowing.push(addr)
      return scenario.following
    },
    async getRecentPosts (opts) {
      calls.getRecentPosts.push(opts)
      return scenario.recent
    },
    async getFollowingFeed (addr, opts) {
      calls.getFollowingFeed.push({ addr, opts })
      return scenario.followingFeed
    }
  }
  return {
    page: new FeedTabsPage({
      memoDb,
      wallet: scenario.wallet,
      scrollToTop: () => { scroll.count++ }
    }),
    calls,
    scroll
  }
}

// The number of page loads that reached the controllers, whether through open,
// a tab switch, nextPage, or previousPage.
function loadedPages (calls) {
  return calls.getRecentPosts.length + calls.getFollowingFeed.length
}

// Actions the feed exposes to the viewer, indexed for random generation: open,
// select Recent, select Following, next page, previous page.
const ACTIONS = [
  (page) => page.open({ limit: 2, offset: 0 }),
  (page) => page.selectTab('Recent'),
  (page) => page.selectTab('Following'),
  (page) => page.nextPage(),
  (page) => page.previousPage()
]

// Run a random action without letting the wallet-less Following failure escape;
// that failure is an action-level error, not a completed load, so it must leave
// the scroll-request count unchanged.
async function runAction (page, action) {
  try {
    await ACTIONS[action](page)
  } catch {
    // Ignore action-level failures (for example, Following without a wallet).
  }
}

function expectsFollowing (scenario) {
  return Boolean(scenario.wallet) && scenario.following.length > 0
}

test('open selects Following exactly when the viewer follows an account', async () => {
  await forAll(
    scenarioGen(),
    async (scenario) => {
      const { page, calls } = makeHarness(scenario)
      await page.open({ limit: scenario.limit, offset: scenario.offset })

      const following = expectsFollowing(scenario)
      return page.isFollowing() === following &&
        page.isRecent() === !following &&
        calls.getFollowing.length === (scenario.wallet ? 1 : 0) &&
        calls.getFollowingFeed.length === (following ? 1 : 0) &&
        calls.getRecentPosts.length === (following ? 0 : 1)
    },
    { label: 'default mode selection' }
  )
})

test('open forwards the requested limit and offset to the selected feed', async () => {
  await forAll(
    scenarioGen(),
    async (scenario) => {
      const { page, calls } = makeHarness(scenario)
      await page.open({ limit: scenario.limit, offset: scenario.offset })

      if (expectsFollowing(scenario)) {
        const call = calls.getFollowingFeed[0]
        return call.addr === MY &&
          call.opts.limit === scenario.limit &&
          call.opts.offset === scenario.offset
      }

      const call = calls.getRecentPosts[0]
      return call.limit === scenario.limit &&
        call.offset === scenario.offset &&
        call.viewer === (scenario.wallet ? MY : undefined)
    },
    { label: 'open forwards limit and offset' }
  )
})

test('the loaded posts and pagination come from the selected feed', async () => {
  await forAll(
    scenarioGen(),
    async (scenario) => {
      const { page } = makeHarness(scenario)
      await page.open({ limit: scenario.limit, offset: scenario.offset })

      const expected = expectsFollowing(scenario) ? scenario.followingFeed : scenario.recent
      return page.posts === expected.posts && page.pagination === expected.pagination
    },
    { label: 'selected feed contents' }
  )
})

test('switching to the other tab resets the offset to the first page', async () => {
  await forAll(
    scenarioGen(),
    async (scenario) => {
      const { page } = makeHarness(scenario)
      await page.open({ limit: scenario.limit, offset: scenario.offset })

      if (page.isFollowing()) {
        await page.selectTab('Recent')
        return page.offset === 0 && page.isRecent()
      }

      if (!scenario.wallet) {
        // The Following tab needs an authenticated wallet to load, so it is
        // not selectable in this scenario.
        return page.offset === scenario.offset && page.isRecent()
      }

      await page.selectTab('Following')
      return page.offset === 0 && page.isFollowing()
    },
    { label: 'tab switch resets offset' }
  )
})

test('selecting the active tab reloads nothing', async () => {
  await forAll(
    scenarioGen(),
    async (scenario) => {
      const { page, calls } = makeHarness(scenario)
      await page.open({ limit: scenario.limit, offset: scenario.offset })

      page.offset = scenario.offset + 10
      const label = page.isFollowing() ? 'following' : 'recent'
      const loadsBefore = calls.getRecentPosts.length + calls.getFollowingFeed.length
      await page.selectTab(label)

      return page.offset === scenario.offset + 10 &&
        calls.getRecentPosts.length + calls.getFollowingFeed.length === loadsBefore
    },
    { label: 'active tab reload' }
  )
})

test('nextPage advances by one page exactly when more pages exist', async () => {
  await forAll(
    scenarioGen(),
    async (scenario) => {
      const { page, calls } = makeHarness(scenario)
      await page.open({ limit: scenario.limit, offset: scenario.offset })

      const before = page.offset
      const hadMore = page.canLoadMore()
      const loadsBefore = calls.getRecentPosts.length + calls.getFollowingFeed.length
      await page.nextPage()
      const loadsAfter = calls.getRecentPosts.length + calls.getFollowingFeed.length

      if (hadMore) {
        return page.offset === before + page.pageSize && loadsAfter === loadsBefore + 1
      }
      return page.offset === before && loadsAfter === loadsBefore
    },
    { label: 'nextPage invariant' }
  )
})

test('previousPage never moves before the first page', async () => {
  await forAll(
    scenarioGen(),
    async (scenario) => {
      const { page } = makeHarness(scenario)
      await page.open({ limit: scenario.limit, offset: scenario.offset })

      await page.previousPage()
      return page.offset === Math.max(0, scenario.offset - scenario.limit)
    },
    { label: 'previousPage clamp' }
  )
})

test('emptyBecauseNoFollows is true exactly for an empty Following tab with no followees', async () => {
  await forAll(
    scenarioGen(),
    async (scenario) => {
      const { page } = makeHarness(scenario)
      await page.open({ limit: scenario.limit, offset: scenario.offset })

      if (scenario.wallet && scenario.following.length === 0) {
        await page.selectTab('Following')
      }

      const expected = page.mode === FeedTabsPage.FOLLOWING_MODE &&
        page.posts.length === 0 &&
        scenario.following.length === 0
      return page.emptyBecauseNoFollows === expected
    },
    { label: 'emptyBecauseNoFollows invariant' }
  )
})

test('getState mirrors the controller state', async () => {
  await forAll(
    scenarioGen(),
    async (scenario) => {
      const { page } = makeHarness(scenario)
      await page.open({ limit: scenario.limit, offset: scenario.offset })

      const state = page.getState()
      return state.mode === page.mode &&
        state.offset === page.offset &&
        state.posts === page.posts &&
        state.pagination === page.pagination &&
        state.emptyBecauseNoFollows === page.emptyBecauseNoFollows
    },
    { label: 'getState mirror' }
  )
})

test('getPost returns a loaded post by txid and null otherwise', async () => {
  await forAll(
    scenarioGen(),
    async (scenario) => {
      const { page } = makeHarness(scenario)
      await page.open({ limit: scenario.limit, offset: scenario.offset })

      if (page.posts.length === 0) {
        return page.getPost('not-a-txid') === null
      }

      return page.getPost(page.posts[0].txid) === page.posts[0] &&
        page.getPost('not-a-txid') === null
    },
    { label: 'getPost lookup' }
  )
})

// The feed resets the viewport after a page load by calling the injected
// scrollToTop adapter. These properties tie that request to the loads that
// actually happened, so the reset can never drift from the pagination state.
test('open requests exactly one scroll to the top', async () => {
  await forAll(
    scenarioGen(),
    async (scenario) => {
      const { page, scroll } = makeHarness(scenario)
      await page.open({ limit: scenario.limit, offset: scenario.offset })

      return scroll.count === 1
    },
    { label: 'open scroll reset' }
  )
})

test('selecting the active tab requests no scroll and switching tabs requests exactly one', async () => {
  await forAll(
    scenarioGen(),
    async (scenario) => {
      const { page, scroll } = makeHarness(scenario)
      await page.open({ limit: scenario.limit, offset: scenario.offset })

      const active = page.isFollowing() ? 'Following' : 'Recent'
      const before = scroll.count
      await page.selectTab(active)
      if (scroll.count !== before) return false

      if (page.isFollowing()) {
        // Following -> Recent always loads and resets the viewport.
        await page.selectTab('Recent')
        return scroll.count === before + 1
      }

      if (!scenario.wallet) {
        // Recent -> Following needs an authenticated wallet to load; the
        // failure must not request a scroll.
        try {
          await page.selectTab('Following')
        } catch {
          return scroll.count === before
        }
        return false
      }

      await page.selectTab('Following')
      return scroll.count === before + 1
    },
    { label: 'tab switch scroll reset' }
  )
})

test('nextPage requests one scroll exactly when it advances a page', async () => {
  await forAll(
    scenarioGen(),
    async (scenario) => {
      const { page, calls, scroll } = makeHarness(scenario)
      await page.open({ limit: scenario.limit, offset: scenario.offset })

      const before = scroll.count
      const hadMore = page.canLoadMore()
      const loadsBefore = loadedPages(calls)
      await page.nextPage()

      if (hadMore) {
        return scroll.count === before + 1 && loadedPages(calls) === loadsBefore + 1
      }
      return scroll.count === before && loadedPages(calls) === loadsBefore
    },
    { label: 'nextPage scroll reset' }
  )
})

test('previousPage requests one scroll exactly when it moves off the first page', async () => {
  await forAll(
    scenarioGen(),
    async (scenario) => {
      const { page, calls, scroll } = makeHarness(scenario)
      await page.open({ limit: scenario.limit, offset: scenario.offset })

      const before = scroll.count
      const hadOffset = page.offset > 0
      const loadsBefore = loadedPages(calls)
      await page.previousPage()

      if (hadOffset) {
        return scroll.count === before + 1 && loadedPages(calls) === loadsBefore + 1
      }
      return scroll.count === before && loadedPages(calls) === loadsBefore
    },
    { label: 'previousPage scroll reset' }
  )
})

test('scroll requests equal successful feed loads across random action sequences', async () => {
  await forAll(
    scenarioGen(),
    async (scenario) => {
      const { page, calls, scroll } = makeHarness(scenario)
      const steps = intGen(rng, 1, 12)()

      for (let i = 0; i < steps; i++) {
        await runAction(page, intGen(rng, 0, ACTIONS.length - 1)())
        if (scroll.count !== loadedPages(calls)) return false
      }

      return true
    },
    { label: 'scroll/load conservation' }
  )
})
