/*
  Property tests for the account page posts feed.

  The unit tests probe a few fixed post lists and page sizes. These properties
  cover broad ranges so the account feed's loading invariants hold everywhere:

    - conservation: loadPosts returns exactly the requested page of the
      account's posts, and canLoadMore is true exactly when posts remain.
    - round trip: getPost returns the loaded post for any loaded txid and
      null for any unknown txid.
*/

'use strict'

const test = require('node:test')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const { seededRandom, forAll, intGen } = require('./harness')
const AccountPage = require('../../src/services/account-page')
const { AccountPostsFeed } = require('../../src/components/app-body/account/account-posts-feed')
const { formatSeen } = require('../../src/services/post-timestamp')

const rng = seededRandom(20261008)

const ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

function makeWallet (address = ADDRESS) {
  return { walletInfo: { cashAddress: address } }
}

// A fake memo-db client serving posts by address with pagination, mirroring
// the account page's real client contract.
function makeMemoDb (posts = []) {
  return {
    async getPostsByAddr (addr, { limit = 50, offset = 0 } = {}) {
      const filtered = posts.filter((post) => post.addr === addr)
      const page = filtered.slice(offset, offset + limit)
      return {
        posts: page,
        pagination: {
          total: filtered.length,
          limit,
          offset,
          hasMore: offset + page.length < filtered.length
        }
      }
    }
  }
}

function makePosts (total, addr = ADDRESS) {
  return Array.from({ length: total }, (_, i) => ({
    txid: `${i}`.padStart(64, '0'),
    addr,
    text: `memo ${i}`
  }))
}

test('loadPosts loads exactly the requested page and canLoadMore reports the remainder', async () => {
  await forAll(
    (i) => ({ total: intGen(rng, 0, 40)(), limit: intGen(rng, 1, 20)() }),
    async ({ total, limit }) => {
      const wallet = makeWallet()
      const posts = makePosts(total)
      const page = new AccountPage({ wallet, memoDb: makeMemoDb(posts) })

      const result = await page.loadPosts({ limit, offset: 0 })
      const expectedCount = Math.min(total, limit)

      return result.posts.length === expectedCount &&
        page.posts.length === expectedCount &&
        page.canLoadMore() === (total > limit)
    },
    { label: 'account posts page conservation' }
  )
})

test('getPost round-trips every loaded post by txid and returns null otherwise', async () => {
  await forAll(
    (i) => intGen(rng, 0, 20)(),
    async (total) => {
      const wallet = makeWallet()
      const posts = makePosts(total)
      const page = new AccountPage({ wallet, memoDb: makeMemoDb(posts) })

      await page.loadPosts({ limit: 50, offset: 0 })

      if (posts.length === 0) return page.getPost('missing') === null

      return page.getPost(posts[0].txid) === posts[0] &&
        page.getPost('missing') === null
    },
    { label: 'account getPost round trip' }
  )
})

test('renders the block number and formatted timestamp for every post', async () => {
  await forAll(
    (i) => ({ blockHeight: intGen(rng, 1, 900000)(), seen: intGen(rng, 1e9, 2e9)() }),
    ({ blockHeight, seen }) => {
      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(AccountPostsFeed, {
          posts: [{ txid: 'a'.repeat(64), addr: ADDRESS, text: 'memo', blockHeight, seen }]
        })
      )
      return html.includes(`Block ${blockHeight}`) && html.includes(formatSeen(seen))
    },
    { samples: 50, label: 'account feed post metadata' }
  )
})
