import { assert } from 'chai'
import sinon from 'sinon'
import {
  normalizeTwoPushMemoDatas,
  stripLeadingEmptyPushes,
  txHashFromPush,
  logProcessError
} from '../../../../src/use-cases/action-types/helpers.js'
import { PREFIX_SET_PROFILE_PIC, PREFIX_POST } from '../../../../src/lib/memo-codes.js'

describe('#action-types/helpers', () => {
  describe('#normalizeTwoPushMemoDatas', () => {
    it('should pass through standard two-push encoding', () => {
      const prefix = PREFIX_SET_PROFILE_PIC
      const url = Buffer.from('https://example.com/pic.png', 'utf8')
      const normalized = normalizeTwoPushMemoDatas([prefix, url])
      assert.equal(normalized.length, 2)
      assert.equal(normalized[1].toString('utf8'), 'https://example.com/pic.png')
    })

    it('should split single-push prefix+payload (profile pic on-chain format)', () => {
      const url = Buffer.from('-hash-or-url-bytes', 'utf8')
      const combined = Buffer.concat([PREFIX_SET_PROFILE_PIC, url])
      const normalized = normalizeTwoPushMemoDatas([combined])
      assert.equal(normalized.length, 2)
      assert.deepEqual(normalized[0], PREFIX_SET_PROFILE_PIC)
      assert.deepEqual(normalized[1], url)
    })

    it('should handle user sample: one push with 0x6d0a prefix and 18-byte payload', () => {
      const combined = Buffer.from(
        '6d0a2da40232abb64740e8abeef1f102bdc92ed5',
        'hex'
      )
      const normalized = normalizeTwoPushMemoDatas([combined])
      assert.equal(normalized.length, 2)
      assert.equal(normalized[0][1], 0x0a)
      assert.equal(normalized[1].length, 18)
    })

    it('should strip leading empty push before normalizing', () => {
      const message = Buffer.from('hello', 'utf8')
      const combined = Buffer.concat([PREFIX_POST, message])
      const normalized = normalizeTwoPushMemoDatas([Buffer.alloc(0), combined])
      assert.equal(normalized.length, 2)
      assert.equal(normalized[1].toString('utf8'), 'hello')
    })

    it('should not split a single 2-byte memo-prefix push', () => {
      const prefix = Buffer.from([0x6d, 0x05])
      const normalized = normalizeTwoPushMemoDatas([prefix])
      assert.equal(normalized.length, 1)
      assert.deepEqual(normalized[0], prefix)
    })

    it('should not split when extra pushes follow a memo-prefix push', () => {
      const prefix = Buffer.from([0x6d, 0x05, 0x01])
      const tail = [Buffer.from([0xaa]), Buffer.from([0xbb])]
      const normalized = normalizeTwoPushMemoDatas([prefix, ...tail])
      assert.equal(normalized.length, 3)
      assert.deepEqual(normalized[0], prefix)
    })
  })

  describe('#stripLeadingEmptyPushes', () => {
    it('should remove only leading empty pushes', () => {
      const payload = Buffer.from([0xab])
      const result = stripLeadingEmptyPushes([Buffer.alloc(0), payload])
      assert.equal(result.length, 1)
      assert.deepEqual(result[0], payload)
    })

    it('should not strip a leading non-empty single-byte push', () => {
      const payload = Buffer.from([0xcd])
      const result = stripLeadingEmptyPushes([Buffer.from([0xab]), payload])
      assert.equal(result.length, 2)
      assert.deepEqual(result[0], Buffer.from([0xab]))
      assert.deepEqual(result[1], payload)
    })

    it('should keep a lone empty push (only strip when more than one remains)', () => {
      const result = stripLeadingEmptyPushes([Buffer.alloc(0)])
      assert.equal(result.length, 1)
      assert.equal(result[0].length, 0)
    })

    it('should keep stripping empties when a later push is falsy', () => {
      const result = stripLeadingEmptyPushes([Buffer.alloc(0), null, Buffer.from([0xab])])
      assert.equal(result.length, 2)
      assert.equal(result[0], null)
      assert.deepEqual(result[1], Buffer.from([0xab]))
    })
  })

  describe('#txHashFromPush', () => {
    it('should return null for a null buffer', () => {
      assert.equal(txHashFromPush(null), null)
    })

    it('should return null for a buffer that is not 32 bytes', () => {
      assert.equal(txHashFromPush(Buffer.from('short', 'utf8')), null)
    })

    it('should reverse a 32-byte buffer and encode as hex', () => {
      const buf = Buffer.alloc(32, 0xab)
      assert.equal(txHashFromPush(buf), 'ab'.repeat(32))
    })
  })

  describe('#logProcessError', () => {
    it('should store blockHeight on process error records', async () => {
      const create = sinon.stub().resolves()
      const adapters = { processErrorDb: { create } }

      await logProcessError(adapters, 'tx1', 'bad data', 600100)

      assert.equal(create.callCount, 1)
      assert.equal(create.firstCall.args[0], 'tx1')
      assert.equal(create.firstCall.args[1].error, 'bad data')
      assert.equal(create.firstCall.args[1].blockHeight, 600100)
    })
  })
})
