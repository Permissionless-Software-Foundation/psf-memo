/*
  Unit tests for the shared PaginatedPage base controller.

  The base class encapsulates the common load / canLoadMore pattern shared by
  the recent feed and recent profiles page controllers. These tests exercise
  the base directly, including the null-pagination edge case that the
  subclass tests do not cover.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const PaginatedPage = require('../../src/services/paginated-page')

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

test('load stores the list under the configured list field', async () => {
  const items = [{ key: 'a' }, { key: 'b' }]
  const page = new TestPage({ memoDb: makeMemoDb(items, { total: 2 }) })

  const result = await page.load()

  assert.deepEqual(result.items, items)
  assert.deepEqual(page.items, items)
  assert.equal(result.pagination.total, 2)
})

test('load throws when no memo db client is provided', async () => {
  const page = new TestPage({})

  await assert.rejects(
    () => page.load(),
    /requires a memo db client/
  )
})

test('load defaults limit to 50 and offset to 0', async () => {
  const calls = []
  const memoDb = {
    async getItems (params) {
      calls.push(params)
      return { items: [], pagination: {} }
    }
  }
  const page = new TestPage({ memoDb })

  await page.load()

  assert.deepEqual(calls, [{ limit: 50, offset: 0 }])
})

test('canLoadMore returns false when pagination is null', async () => {
  const page = new TestPage({ memoDb: makeMemoDb([], null) })
  await page.load()

  assert.equal(page.canLoadMore(), false)
})

test('canLoadMore returns false when pagination has no hasMore field', async () => {
  const page = new TestPage({ memoDb: makeMemoDb([], { total: 0 }) })
  await page.load()

  assert.equal(page.canLoadMore(), false)
})

test('canLoadMore reflects pagination.hasMore', async () => {
  const more = new TestPage({ memoDb: makeMemoDb([], { hasMore: true }) })
  await more.load()
  assert.equal(more.canLoadMore(), true)

  const done = new TestPage({ memoDb: makeMemoDb([], { hasMore: false }) })
  await done.load()
  assert.equal(done.canLoadMore(), false)
})
