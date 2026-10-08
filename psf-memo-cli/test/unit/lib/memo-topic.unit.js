/*
  Unit tests for the pure memo-topic helpers.

  The command reads one page of a single topic's posts. These pin the required
  -r room, the page defaults, and the optional viewer.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  parseTopicFlags,
  DEFAULT_TOPIC_LIMIT,
  DEFAULT_TOPIC_OFFSET
} from '../../../src/lib/memo-topic.js'
import { captureUsageError, assertPageFlagViolations } from '../../support/usage-error.js'

describe('#memo-topic helpers', () => {
  it('exposes the default page', () => {
    assert.equal(DEFAULT_TOPIC_LIMIT, 50)
    assert.equal(DEFAULT_TOPIC_OFFSET, 0)
  })

  it('requires the -r room', () => {
    const err = captureUsageError(() => parseTopicFlags({}))
    assert.equal(err.message, 'You must specify a topic room with the -r flag.')
  })

  it('resolves the room with the default page and no viewer', () => {
    assert.deepEqual(parseTopicFlags({ room: 'general' }), {
      room: 'general',
      viewer: null,
      limit: 50,
      offset: 0
    })
  })

  it('resolves an explicit page and viewer', () => {
    assert.deepEqual(parseTopicFlags({ room: 'general', viewer: 'viewerB', limit: '2', offset: '4' }), {
      room: 'general',
      viewer: 'viewerB',
      limit: 2,
      offset: 4
    })
  })

  it('rejects a non-negative-integer page violation', () => {
    assertPageFlagViolations(parseTopicFlags, { room: 'general' })
  })
})
