/*
  Property tests for the FollowingFeedPage controller.

  The unit tests probe a few fixed pagination shapes. These properties cover
  the load/`emptyBecauseNoFollows`/`canLoadMore` invariants over broad random
  inputs so they hold everywhere:

    - empty state: emptyBecauseNoFollows is true exactly when no posts are
      returned and the requested offset is zero.
    - has more: canLoadMore always mirrors pagination.hasMore.
    - forwarding: the load limits and offset forwarded to the memo-db client
      match exactly what the caller requested.
    - lookup: getPost returns a loaded post by txid and null otherwise.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen } = require('./harness')
const FollowingFeedPage = require('../../src/services/following-feed-page')

const rng = seededRandom(20260902)

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const HEX = '0123456789abcdef'

function txidGen () {
  let out = ''
  for (let i = 0; i < 64; i++) {
    out += HEX[Math.floor(rng() * HEX.length)]
  }
  return out
}

function makeMemoDb (posts, pagination) {
  return {
    async getFollowingFeed (addr, { limit, offset }) {
      return { posts, pagination }
    }
  }
}

function fixtureGen () {
  return () => {
    const n = intGen(rng, 0, 5)()
    const posts = []
    for (let i = 0; i < n; i++) {
      posts.push({ txid: txidGen(), text: 'post ' + i })
    }
    return {
      posts,
      pagination: { hasMore: rng() < 0.5 },
      limit: intGen(rng, 1, 100)(),
      offset: intGen(rng, 0, 200)()
    }
  }
}

test('emptyBecauseNoFollows is true exactly for an empty feed at offset zero', async () => {
  await forAll(
    fixtureGen(),
    async ({ posts, pagination, limit, offset }) => {
      const page = new FollowingFeedPage({
        memoDb: makeMemoDb(posts, pagination),
        wallet: { walletInfo: { cashAddress: MY_ADDRESS } }
      })
      const result = await page.load({ limit, offset })

      return result.emptyBecauseNoFollows === (posts.length === 0 && offset === 0) &&
        page.emptyBecauseNoFollows === (posts.length === 0 && offset === 0)
    },
    { label: 'emptyBecauseNoFollows state invariant' }
  )
})

test('canLoadMore always mirrors pagination.hasMore', async () => {
  await forAll(
    fixtureGen(),
    async ({ posts, pagination, limit, offset }) => {
      const page = new FollowingFeedPage({
        memoDb: makeMemoDb(posts, pagination),
        wallet: { walletInfo: { cashAddress: MY_ADDRESS } }
      })
      await page.load({ limit, offset })

      return page.canLoadMore() === (pagination.hasMore === true) &&
        page.pagination.hasMore === pagination.hasMore
    },
    { label: 'canLoadMore mirrors hasMore' }
  )
})

test('load forwards exactly the requested limit and offset to the memo-db client', async () => {
  await forAll(
    fixtureGen(),
    async ({ posts, pagination, limit, offset }) => {
      const calls = []
      const memoDb = {
        async getFollowingFeed (addr, params) {
          calls.push({ addr, params })
          return { posts, pagination }
        }
      }
      const page = new FollowingFeedPage({ memoDb, wallet: { walletInfo: { cashAddress: MY_ADDRESS } } })
      await page.load({ limit, offset })

      return calls.length === 1 &&
        calls[0].addr === MY_ADDRESS &&
        calls[0].params.limit === limit &&
        calls[0].params.offset === offset
    },
    { label: 'load forwards limit and offset' }
  )
})

test('getPost returns a loaded post by txid, otherwise null', async () => {
  await forAll(
    fixtureGen(),
    async ({ posts, pagination, limit, offset }) => {
      const page = new FollowingFeedPage({
        memoDb: makeMemoDb(posts, pagination),
        wallet: { walletInfo: { cashAddress: MY_ADDRESS } }
      })
      await page.load({ limit, offset })

      if (posts.length === 0) return true

      const any = page.getPost(posts[0].txid)
      if (!any || any.text !== posts[0].text) return false
      return page.getPost('0'.repeat(64)) === null
    },
    { label: 'getPost lookup' }
  )
})
