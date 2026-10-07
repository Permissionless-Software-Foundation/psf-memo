/*
  Unit tests for the pure Memo feed helpers.

  These pin the default page (limit 50, offset 0, no viewer), numeric flag
  parsing with a clear usage error for a bad limit/offset, and the human
  summary that lists each post and the service pagination.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  DEFAULT_FEED_LIMIT,
  DEFAULT_FEED_OFFSET,
  parseFeedFlags,
  formatFeedMessage
} from '../../../src/lib/memo-feed.js'
import { UsageError } from '../../../src/lib/reporter.js'

describe('#memo-feed helpers', () => {
  describe('parseFeedFlags', () => {
    it('defaults to limit 50, offset 0, and no viewer', () => {
      assert.deepEqual(parseFeedFlags({}), {
        limit: DEFAULT_FEED_LIMIT,
        offset: DEFAULT_FEED_OFFSET,
        viewer: null
      })
      assert.equal(DEFAULT_FEED_LIMIT, 50)
      assert.equal(DEFAULT_FEED_OFFSET, 0)
    })

    it('parses string limit and offset from the command line', () => {
      assert.deepEqual(parseFeedFlags({ limit: '2', offset: '4' }), {
        limit: 2,
        offset: 4,
        viewer: null
      })
    })

    it('accepts zero as a real page value', () => {
      assert.deepEqual(parseFeedFlags({ limit: '0', offset: '0' }), {
        limit: 0,
        offset: 0,
        viewer: null
      })
    })

    it('treats empty and null flags as absent', () => {
      for (const value of ['', null]) {
        assert.deepEqual(parseFeedFlags({ limit: value, offset: value }), {
          limit: DEFAULT_FEED_LIMIT,
          offset: DEFAULT_FEED_OFFSET,
          viewer: null
        })
      }
    })

    it('keeps a viewer address and treats an empty viewer as none', () => {
      assert.equal(
        parseFeedFlags({ viewer: 'bitcoincash:qviewer' }).viewer,
        'bitcoincash:qviewer'
      )
      assert.isNull(parseFeedFlags({ viewer: '' }).viewer)
    })

    const badCases = [
      { flags: { limit: '-1' }, flag: '--limit' },
      { flags: { limit: 'abc' }, flag: '--limit' },
      { flags: { limit: '1.5' }, flag: '--limit' },
      { flags: { offset: '-2' }, flag: '--offset' },
      { flags: { offset: 'nope' }, flag: '--offset' }
    ]

    for (const { flags, flag } of badCases) {
      it(`rejects ${JSON.stringify(flags)} as a usage error naming ${flag}`, () => {
        try {
          parseFeedFlags(flags)
          assert.fail('Expected a usage error')
        } catch (err) {
          assert.instanceOf(err, UsageError)
          assert.include(err.message, flag)
        }
      })
    }
  })

  describe('formatFeedMessage', () => {
    it('lists each post and the service pagination', () => {
      const message = formatFeedMessage(
        [{ txid: 'alpha', text: 'first memo', replyCount: 2, likeCount: 3 }],
        { limit: 50, offset: 0, total: 1, hasMore: false }
      )

      assert.include(message, 'alpha')
      assert.include(message, 'first memo')
      assert.include(message, 'replies 2')
      assert.include(message, 'likes 3')
      assert.include(message, 'total 1')
      assert.include(message, 'hasMore false')
    })

    it('uses singular wording for a single post', () => {
      const message = formatFeedMessage(
        [{ txid: 'a', text: 't', replyCount: 0, likeCount: 0 }],
        { total: 1 }
      )

      assert.include(message, 'Read 1 post')
      assert.notInclude(message, 'Read 1 posts')
    })

    it('reports an empty page', () => {
      const message = formatFeedMessage([], { total: 0, hasMore: false })

      assert.include(message, 'Read 0 posts')
      assert.include(message, 'total 0')
      assert.include(message, 'hasMore false')
    })
  })
})
