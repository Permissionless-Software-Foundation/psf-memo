/*
  Unit tests for the pure memo-following-feed helper.

  The command reads one page of the viewer's Following feed. This pins the page
  defaults and the shared --limit/--offset validation.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  parseFollowingFeedFlags,
  DEFAULT_FOLLOWING_FEED_LIMIT,
  DEFAULT_FOLLOWING_FEED_OFFSET
} from '../../../src/lib/memo-following-feed.js'
import { UsageError } from '../../../src/lib/reporter.js'

describe('#memo-following-feed helper', () => {
  it('defaults the page to 50/0', () => {
    assert.deepEqual(parseFollowingFeedFlags({}), {
      limit: DEFAULT_FOLLOWING_FEED_LIMIT,
      offset: DEFAULT_FOLLOWING_FEED_OFFSET
    })
  })

  it('parses the --limit and --offset overrides', () => {
    assert.deepEqual(parseFollowingFeedFlags({ limit: '2', offset: '4' }), {
      limit: 2,
      offset: 4
    })
  })

  it('rejects a negative --limit as a usage error', () => {
    let err
    try {
      parseFollowingFeedFlags({ limit: '-1' })
    } catch (e) {
      err = e
    }

    assert.instanceOf(err, UsageError)
    assert.include(err.message, '--limit')
  })

  it('rejects a non-integer --offset as a usage error', () => {
    let err
    try {
      parseFollowingFeedFlags({ offset: 'x' })
    } catch (e) {
      err = e
    }

    assert.instanceOf(err, UsageError)
    assert.include(err.message, '--offset')
  })
})
