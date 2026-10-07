/*
  Unit tests for the shared page-summary fragments used by paginated read
  commands.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { formatReadCount, formatPagination } from '../../../src/lib/page-summary.js'

describe('#page-summary', () => {
  it('pluralizes the read count', () => {
    assert.equal(formatReadCount(0, 'topic'), 'Read 0 topics')
    assert.equal(formatReadCount(1, 'topic'), 'Read 1 topic')
    assert.equal(formatReadCount(3, 'topic'), 'Read 3 topics')
  })

  it('renders the pagination unchanged', () => {
    assert.equal(
      formatPagination({ limit: 50, offset: 0, total: 5, hasMore: false }),
      'pagination: limit 50, offset 0, total 5, hasMore false'
    )
  })
})
