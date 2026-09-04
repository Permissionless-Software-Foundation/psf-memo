/*
  Unit tests for the Search page controller.

  The search page is a thin, testable wrapper around the MemoDb client. It
  captures a query, submits it to the search endpoint, and exposes the returned
  posts and profiles so the view can render them.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const SearchPage = require('../../src/services/search-page')

function makeMemoDb (posts, profiles, pagination) {
  return {
    async search (q, { limit, offset }) {
      return { posts, profiles, pagination }
    }
  }
}

test('load returns posts and profiles', async () => {
  const posts = [{ txid: 'a'.repeat(64), text: 'hello world' }]
  const profiles = [{ addr: 'addr1', name: 'Alice Trout' }]
  const page = new SearchPage({ memoDb: makeMemoDb(posts, profiles, { total: 2 }) })

  page.setQuery('hello')
  const result = await page.submit()

  assert.deepEqual(result.posts, posts)
  assert.deepEqual(result.profiles, profiles)
  assert.equal(result.pagination.total, 2)
})

test('submit forwards query, limit and offset to the memo db client', async () => {
  const calls = []
  const memoDb = {
    async search (q, params) {
      calls.push({ q, params })
      return { posts: [], profiles: [], pagination: {} }
    }
  }
  const page = new SearchPage({ memoDb })

  page.setQuery('alice')
  await page.submit({ limit: 10, offset: 20 })

  assert.deepEqual(calls, [{ q: 'alice', params: { limit: 10, offset: 20 } }])
})

test('submit forwards the viewer address when a wallet is provided', async () => {
  const calls = []
  const memoDb = {
    async search (q, params) {
      calls.push({ q, params })
      return { posts: [], profiles: [], pagination: {} }
    }
  }
  const wallet = { walletInfo: { cashAddress: 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d' } }
  const page = new SearchPage({ memoDb, wallet })

  page.setQuery('alice')
  await page.submit({ limit: 10, offset: 20 })

  assert.deepEqual(calls, [{
    q: 'alice',
    params: {
      limit: 10,
      offset: 20,
      viewer: 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
    }
  }])
})

test('submit defaults limit to 50 and offset to 0', async () => {
  const calls = []
  const memoDb = {
    async search (q, params) {
      calls.push({ q, params })
      return { posts: [], profiles: [], pagination: {} }
    }
  }
  const page = new SearchPage({ memoDb })

  page.setQuery('memo')
  await page.submit()

  assert.deepEqual(calls, [{ q: 'memo', params: { limit: 50, offset: 0 } }])
})

test('submit throws when no memo db client is provided', async () => {
  const page = new SearchPage({})

  await assert.rejects(
    () => page.submit(),
    /requires a memo db client/
  )
})

test('setQuery stores the trimmed query', () => {
  const page = new SearchPage({ memoDb: { async search () { return {} } } })

  page.setQuery('  hello  ')

  assert.equal(page.query, 'hello')
})

test('constructor preserves an injected navigate handler', () => {
  const navigate = () => 'x'
  const page = new SearchPage({ memoDb: { async search () { return {} } }, navigate })

  assert.equal(page.navigate, navigate)
})

test('getPost returns the matching post', async () => {
  const posts = [{ txid: 'a'.repeat(64), text: 'hello world' }]
  const page = new SearchPage({ memoDb: makeMemoDb(posts, [], {}) })

  page.setQuery('hello')
  await page.submit()

  assert.equal(page.getPost('a'.repeat(64)).text, 'hello world')
})

test('getPost returns null when no post matches', async () => {
  const posts = [{ txid: 'a'.repeat(64), text: 'hello world' }]
  const page = new SearchPage({ memoDb: makeMemoDb(posts, [], {}) })

  page.setQuery('hello')
  await page.submit()

  assert.equal(page.getPost('b'.repeat(64)), null)
})

test('getProfile returns the matching profile', async () => {
  const profiles = [{ addr: 'addr1', name: 'Alice Trout' }]
  const page = new SearchPage({ memoDb: makeMemoDb([], profiles, {}) })

  page.setQuery('alice')
  await page.submit()

  assert.equal(page.getProfile('addr1').name, 'Alice Trout')
})

test('getProfile returns null when no profile matches', async () => {
  const profiles = [{ addr: 'addr1', name: 'Alice Trout' }]
  const page = new SearchPage({ memoDb: makeMemoDb([], profiles, {}) })

  page.setQuery('alice')
  await page.submit()

  assert.equal(page.getProfile('addr2'), null)
})

test('canLoadMore reflects pagination.hasMore', async () => {
  const more = new SearchPage({ memoDb: makeMemoDb([], [], { hasMore: true }) })
  more.setQuery('hello')
  await more.submit()
  assert.equal(more.canLoadMore(), true)

  const done = new SearchPage({ memoDb: makeMemoDb([], [], { hasMore: false }) })
  done.setQuery('hello')
  await done.submit()
  assert.equal(done.canLoadMore(), false)
})

test('canLoadMore returns false when pagination is null or missing hasMore', async () => {
  const pageNull = new SearchPage({ memoDb: makeMemoDb([], [], null) })
  pageNull.setQuery('hello')
  await pageNull.submit()
  assert.equal(pageNull.canLoadMore(), false)

  const pageEmpty = new SearchPage({ memoDb: makeMemoDb([], [], { total: 0 }) })
  pageEmpty.setQuery('hello')
  await pageEmpty.submit()
  assert.equal(pageEmpty.canLoadMore(), false)
})
