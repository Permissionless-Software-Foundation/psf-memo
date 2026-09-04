/*
  Property tests for the shared PaginatedPage base controller.

  The unit tests probe a few fixed pagination shapes. These properties cover
  the load/`canLoadMore`/lookup invariants over broad random inputs so they
  hold everywhere for the recent feed and recent profiles pages:

    - has more: canLoadMore always mirrors pagination.hasMore.
    - forwarding: the load limit and offset forwarded to the memo-db client
      match exactly what the caller requested.
    - lookup: the item finder returns a loaded item by key and null otherwise.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen } = require('./harness')
const PaginatedPage = require('../../src/services/paginated-page')

const rng = seededRandom(20260904)

// A minimal concrete subclass exercising the shared base logic.
class TestPage extends PaginatedPage {
  constructor (deps = {}) {
    super(deps, {
      listField: 'items',
      loadMethod: 'getItems',
      errorMessage: 'Test page requires a memo db client.'
    })
  }

  getItem (key) {
    return this.items.find((item) => item.key === key) || null
  }
}

function makeMemoDb (items, pagination) {
  return {
    async getItems ({ limit, offset }) {
      return { items, pagination }
    }
  }
}

function fixtureGen () {
  return () => {
    const n = intGen(rng, 0, 8)()
    const items = []
    for (let i = 0; i < n; i++) {
      items.push({ key: 'item-' + i, text: 'value ' + i })
    }
    return {
      items,
      pagination: { hasMore: rng() < 0.5 },
      limit: intGen(rng, 1, 100)(),
      offset: intGen(rng, 0, 200)()
    }
  }
}

test('canLoadMore always mirrors pagination.hasMore', async () => {
  await forAll(
    fixtureGen(),
    async ({ items, pagination, limit, offset }) => {
      const page = new TestPage({ memoDb: makeMemoDb(items, pagination) })
      await page.load({ limit, offset })

      return page.canLoadMore() === (pagination.hasMore === true) &&
        page.pagination.hasMore === pagination.hasMore
    },
    { label: 'paginated canLoadMore mirrors hasMore' }
  )
})

test('load forwards exactly the requested limit and offset to the memo-db client', async () => {
  await forAll(
    fixtureGen(),
    async ({ items, pagination, limit, offset }) => {
      const calls = []
      const memoDb = {
        async getItems (params) {
          calls.push(params)
          return { items, pagination }
        }
      }
      const page = new TestPage({ memoDb })
      await page.load({ limit, offset })

      return calls.length === 1 &&
        calls[0].limit === limit &&
        calls[0].offset === offset
    },
    { label: 'paginated load forwards limit and offset' }
  )
})

test('getItem returns a loaded item by key, otherwise null', async () => {
  await forAll(
    fixtureGen(),
    async ({ items, pagination, limit, offset }) => {
      const page = new TestPage({ memoDb: makeMemoDb(items, pagination) })
      await page.load({ limit, offset })

      if (items.length === 0) return true

      const any = page.getItem(items[0].key)
      if (!any || any.text !== items[0].text) return false
      return page.getItem('does-not-exist') === null
    },
    { label: 'paginated getItem lookup' }
  )
})
