import { assert } from 'chai'
import { parseLimit, parseOffset, attachReplyCounts } from '../../../../src/use-cases/lib/pagination.js'

describe('#pagination', () => {
  describe('parseLimit', () => {
    it('should default to 100 when limit is absent', () => {
      assert.equal(parseLimit(undefined), 100)
      assert.equal(parseLimit(null), 100)
      assert.equal(parseLimit(''), 100)
    })

    it('should parse a valid positive integer limit', () => {
      assert.equal(parseLimit('10'), 10)
      assert.equal(parseLimit(50), 50)
    })

    it('should reject a non-numeric limit', () => {
      try {
        parseLimit('abc')
        assert.fail('Expected error')
      } catch (err) {
        assert.equal(err.status, 400)
        assert.include(err.message, 'limit must be a positive integer')
      }
    })

    it('should reject a limit below 1', () => {
      try {
        parseLimit(0)
        assert.fail('Expected error')
      } catch (err) {
        assert.equal(err.status, 400)
        assert.include(err.message, 'limit must be a positive integer')
      }
    })

    it('should reject a limit over 100', () => {
      try {
        parseLimit(101)
        assert.fail('Expected error')
      } catch (err) {
        assert.equal(err.status, 400)
        assert.include(err.message, 'limit cannot exceed 100')
      }
    })
  })

  describe('parseOffset', () => {
    it('should default to 0 when offset is absent', () => {
      assert.equal(parseOffset(undefined), 0)
      assert.equal(parseOffset(null), 0)
      assert.equal(parseOffset(''), 0)
    })

    it('should parse a valid non-negative integer offset', () => {
      assert.equal(parseOffset('0'), 0)
      assert.equal(parseOffset(25), 25)
    })

    it('should reject a non-numeric offset', () => {
      try {
        parseOffset('xyz')
        assert.fail('Expected error')
      } catch (err) {
        assert.equal(err.status, 400)
        assert.include(err.message, 'offset must be a non-negative integer')
      }
    })

    it('should reject a negative offset', () => {
      try {
        parseOffset(-1)
        assert.fail('Expected error')
      } catch (err) {
        assert.equal(err.status, 400)
        assert.include(err.message, 'offset must be a non-negative integer')
      }
    })
  })

  describe('attachReplyCounts', () => {
    it('should attach the reply count for each post', () => {
      const posts = [{ txid: 'a', text: 'x' }, { txid: 'b', text: 'y' }]
      const counts = new Map([['a', 3]])

      const result = attachReplyCounts(posts, counts)

      assert.equal(result[0].replyCount, 3)
      assert.equal(result[0].text, 'x')
      assert.equal(result[1].replyCount, 0)
    })
  })
})
