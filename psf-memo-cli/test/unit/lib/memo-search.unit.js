/*
  Unit tests for the pure memo-search helpers.

  The command reads one page of GET /search and reports the matching posts and
  profiles. These pin the required -q query, the page defaults, the optional
  viewer, and the blank-query empty page.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  parseSearchFlags,
  isEmptySearchQuery,
  emptySearchResult,
  formatSearchMessage,
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SEARCH_OFFSET
} from '../../../src/lib/memo-search.js'
import { captureUsageError, assertPageFlagViolations } from '../../support/usage-error.js'

describe('#memo-search helpers', () => {
  it('exposes the default page', () => {
    assert.equal(DEFAULT_SEARCH_LIMIT, 50)
    assert.equal(DEFAULT_SEARCH_OFFSET, 0)
  })

  it('requires the -q query', () => {
    const err = captureUsageError(() => parseSearchFlags({}))
    assert.equal(err.message, 'You must specify a search query with the -q flag.')
  })

  it('accepts an empty string as a provided query', () => {
    assert.deepEqual(parseSearchFlags({ query: '' }), {
      query: '',
      viewer: null,
      limit: 50,
      offset: 0
    })
  })

  it('resolves the query with the default page and no viewer', () => {
    assert.deepEqual(parseSearchFlags({ query: 'memo' }), {
      query: 'memo',
      viewer: null,
      limit: 50,
      offset: 0
    })
  })

  it('resolves an explicit page and viewer', () => {
    assert.deepEqual(
      parseSearchFlags({ query: 'memo', viewer: 'viewerB', limit: '2', offset: '4' }),
      { query: 'memo', viewer: 'viewerB', limit: 2, offset: 4 }
    )
  })

  it('rejects a non-negative-integer page violation', () => {
    assertPageFlagViolations(parseSearchFlags, { query: 'memo' })
  })

  it('detects blank queries without treating whitespace as a query', () => {
    assert.isTrue(isEmptySearchQuery(''))
    assert.isTrue(isEmptySearchQuery('   '))
    assert.isTrue(isEmptySearchQuery(null))
    assert.isTrue(isEmptySearchQuery(undefined))
    assert.isFalse(isEmptySearchQuery('memo'))
  })

  it('builds an empty page for a blank query', () => {
    assert.deepEqual(emptySearchResult(25, 5), {
      posts: [],
      profiles: [],
      pagination: { limit: 25, offset: 5, total: 0, hasMore: false }
    })
  })

  it('defaults the empty page to the shared search page', () => {
    assert.deepEqual(emptySearchResult(), {
      posts: [],
      profiles: [],
      pagination: { limit: DEFAULT_SEARCH_LIMIT, offset: DEFAULT_SEARCH_OFFSET, total: 0, hasMore: false }
    })
  })

  it('renders the posts, profiles, and pagination summary', () => {
    const message = formatSearchMessage(
      [{ txid: 'alpha', text: 'first memo' }],
      [{ addr: 'bitcoincash:qcarol', name: 'Carol Search' }],
      { limit: 50, offset: 0, total: 2, hasMore: false }
    )

    assert.include(message, 'Read 1 post')
    assert.include(message, 'alpha: first memo')
    assert.include(message, 'Read 1 profile')
    assert.include(message, 'bitcoincash:qcarol: Carol Search')
    assert.include(message, 'pagination: limit 50, offset 0, total 2, hasMore false')
  })
})
