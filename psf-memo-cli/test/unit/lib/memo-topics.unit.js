/*
  Unit tests for the pure memo-topics helpers.

  The command reads one page of the topic list from psf-memo-db. These pin the
  page defaults, the flag validation, and the human-readable summary.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  parseTopicsFlags,
  formatTopicsMessage,
  DEFAULT_TOPICS_LIMIT,
  DEFAULT_TOPICS_OFFSET
} from '../../../src/lib/memo-topics.js'
import { assertPageFlagViolations } from '../../support/usage-error.js'

describe('#memo-topics helpers', () => {
  it('exposes the default page', () => {
    assert.equal(DEFAULT_TOPICS_LIMIT, 50)
    assert.equal(DEFAULT_TOPICS_OFFSET, 0)
  })

  it('resolves the default page when no flags are given', () => {
    assert.deepEqual(parseTopicsFlags({}), { limit: 50, offset: 0 })
  })

  it('parses an explicit page', () => {
    assert.deepEqual(parseTopicsFlags({ limit: '2', offset: '4' }), { limit: 2, offset: 4 })
  })

  it('rejects a non-negative-integer violation', () => {
    assertPageFlagViolations(parseTopicsFlags)
  })

  it('renders the topics and the pagination', () => {
    const message = formatTopicsMessage(
      [
        { room: 'memo', postCount: 5, lastSeen: 1700020000000, followerCount: 12 },
        { room: 'cash', postCount: 2, lastSeen: 1700010000000, followerCount: 4 }
      ],
      { limit: 50, offset: 0, total: 2, hasMore: false }
    )

    assert.include(message, 'Read 2 topics')
    assert.include(message, 'memo')
    assert.include(message, 'lastSeen 1700020000000')
    assert.include(message, '5 posts')
    assert.include(message, '12 followers')
    assert.include(message, 'pagination: limit 50, offset 0, total 2, hasMore false')
  })

  it('singularizes a single topic', () => {
    const message = formatTopicsMessage(
      [{ room: 'memo', postCount: 5, lastSeen: 1, followerCount: 1 }],
      { limit: 50, offset: 0, total: 1, hasMore: false }
    )

    assert.include(message, 'Read 1 topic\n')
  })
})
