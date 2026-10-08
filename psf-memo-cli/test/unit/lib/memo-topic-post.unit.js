/*
  Unit tests for the pure memo-topic-post helper.

  The command broadcasts a 0x6d0c topic message. This pins the protocol prefix,
  the combined room + message byte limit, the flag validation, and the
  human-readable summary.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  parseTopicPostFlags,
  formatTopicPostMessage,
  MEMO_TOPIC_POST_PREFIX,
  MAX_TOPIC_MESSAGE_BYTES
} from '../../../src/lib/memo-topic-post.js'
import { captureUsageError } from '../../support/usage-error.js'

describe('#memo-topic-post helper', () => {
  it('exposes the 0x6d0c prefix and the 214-byte limit', () => {
    assert.equal(MEMO_TOPIC_POST_PREFIX, '6d0c')
    assert.equal(MAX_TOPIC_MESSAGE_BYTES, 214)
  })

  it('resolves the room and message', () => {
    assert.deepEqual(parseTopicPostFlags({ room: 'general', memo: 'hello topic' }), {
      room: 'general',
      message: 'hello topic'
    })
  })

  it('accepts a room plus message exactly at the combined byte limit', () => {
    const message = 'a'.repeat(207) // 207 bytes; 7-byte room -> 214 total

    assert.deepEqual(parseTopicPostFlags({ room: 'general', memo: message }), {
      room: 'general',
      message
    })
  })

  it('rejects a combined room plus message over the byte limit', () => {
    const err = captureUsageError(() =>
      parseTopicPostFlags({ room: 'general', memo: 'é'.repeat(104) })
    )
    assert.equal(err.message, 'Topic message is too long. Maximum is 214 bytes.')
  })

  it('requires the topic room', () => {
    const err = captureUsageError(() => parseTopicPostFlags({ memo: 'hello' }))
    assert.equal(err.message, 'You must specify a topic room with the -r flag.')
  })

  it('requires the topic message', () => {
    const err = captureUsageError(() => parseTopicPostFlags({ room: 'general' }))
    assert.equal(err.message, 'You must specify topic message text with the -m flag.')
  })

  it('rejects an empty topic message', () => {
    const err = captureUsageError(() => parseTopicPostFlags({ room: 'general', memo: '' }))
    assert.equal(err.message, 'Topic message must not be empty.')
  })

  it('renders the txid and explorer link', () => {
    const message = formatTopicPostMessage({ txid: 'abc', explorerUrl: 'https://bch.loping.net/tx/abc' })

    assert.include(message, 'abc')
    assert.include(message, 'https://bch.loping.net/tx/abc')
  })
})
