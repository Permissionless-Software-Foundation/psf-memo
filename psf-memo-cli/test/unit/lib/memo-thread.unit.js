/*
  Unit tests for the pure Memo thread helpers.

  These pin the required -t txid flag (with the exact usage message), and the
  human summary that renders the root post, its direct replies in service
  order, and nested replies indented under their parent.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  parseThreadFlags,
  formatThreadMessage
} from '../../../src/lib/memo-thread.js'
import { UsageError } from '../../../src/lib/reporter.js'

const THREAD = {
  txid: 'thread-root',
  text: 'the root',
  replyCount: 3,
  likeCount: 2,
  replies: [
    { txid: 'thread-reply-1', text: 'r1', replyCount: 0, likeCount: 1, replies: [] },
    {
      txid: 'thread-reply-2',
      text: 'r2',
      replyCount: 1,
      likeCount: 0,
      replies: [
        { txid: 'thread-reply-2-a', text: 'r2a', replyCount: 0, likeCount: 3, replies: [] }
      ]
    },
    { txid: 'thread-reply-3', text: 'r3', replyCount: 0, likeCount: 2, replies: [] }
  ]
}

describe('#memo-thread helpers', () => {
  describe('parseThreadFlags', () => {
    it('resolves the txid from the -t/--txid flag', () => {
      assert.deepEqual(parseThreadFlags({ txid: 'abc123' }), { txid: 'abc123' })
    })

    it('rejects a missing txid with the documented usage error', () => {
      try {
        parseThreadFlags({})
        assert.fail('Expected a usage error')
      } catch (err) {
        assert.instanceOf(err, UsageError)
        assert.equal(err.message, 'You must specify a post txid with the -t flag.')
      }
    })

    it('rejects an empty txid with the documented usage error', () => {
      try {
        parseThreadFlags({ txid: '' })
        assert.fail('Expected a usage error')
      } catch (err) {
        assert.instanceOf(err, UsageError)
        assert.equal(err.message, 'You must specify a post txid with the -t flag.')
      }
    })
  })

  describe('formatThreadMessage', () => {
    it('renders the root, direct replies in order, and nested replies', () => {
      const message = formatThreadMessage(THREAD)

      assert.include(message, 'thread-root: the root (replies 3, likes 2)')
      assert.include(message, 'thread-reply-1: r1 (replies 0, likes 1)')
      assert.include(message, 'thread-reply-2: r2 (replies 1, likes 0)')
      assert.include(message, 'thread-reply-3: r3 (replies 0, likes 2)')

      const lines = message.split('\n')
      assert.equal(lines[0].startsWith('thread-root'), true)
      assert.equal(lines[1].startsWith('  thread-reply-1'), true)
      assert.equal(lines[3].startsWith('    thread-reply-2-a'), true)
    })

    it('tolerates a thread with no replies', () => {
      const message = formatThreadMessage({ txid: 'solo', text: 'alone', replyCount: 0, likeCount: 0 })

      assert.include(message, 'solo: alone (replies 0, likes 0)')
    })
  })
})
