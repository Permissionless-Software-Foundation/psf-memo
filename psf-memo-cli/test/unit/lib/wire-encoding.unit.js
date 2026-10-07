/*
  Unit tests for the Memo protocol wire-encoding helpers.

  These pin the accepted vectors from the feature file and the malformed-input
  contract: a display txid becomes 32 little-endian bytes, and a cash address
  becomes its 20-byte hash160 in display order (not reversed).
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  txidToWireBytes,
  addressToHash160
} from '../../../src/lib/wire-encoding.js'

describe('#wire-encoding', () => {
  describe('txidToWireBytes', () => {
    it('reverses a display txid into little-endian wire bytes', () => {
      const bytes = txidToWireBytes(
        '0000000000000000000000000000000000000000000000000000000000000001'
      )

      assert.equal(bytes.length, 32)
      assert.equal(
        bytes.toString('hex'),
        '0100000000000000000000000000000000000000000000000000000000000000'
      )
    })

    it('reverses a non-palindromic txid byte for byte', () => {
      const bytes = txidToWireBytes(
        '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20'
      )

      assert.equal(
        bytes.toString('hex'),
        '201f1e1d1c1b1a191817161514131211100f0e0d0c0b0a090807060504030201'
      )
    })

    it('rejects a non-string txid', () => {
      assert.throws(() => txidToWireBytes(null), /64-character hex string/)
      assert.throws(() => txidToWireBytes(123), /64-character hex string/)
    })

    it('rejects a txid of the wrong length', () => {
      assert.throws(() => txidToWireBytes('1234'), /64-character hex string/)
      assert.throws(() => txidToWireBytes('ab'.repeat(33)), /64-character hex string/)
    })

    it('rejects a 64-character non-hex txid', () => {
      assert.throws(() => txidToWireBytes('zz'.repeat(32)), /valid hex string/)
      assert.throws(() => txidToWireBytes('gg'.repeat(32)), /valid hex string/)
    })
  })

  describe('addressToHash160', () => {
    it('returns the 20-byte hash160 in display order', () => {
      const cases = [
        [
          'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d',
          '3e31055173cf58d56edb075499daf29d7b488f09'
        ],
        [
          'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy',
          'cb481232299cd5743151ac4b2d63ae198e7bb0a9'
        ],
        [
          'bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r',
          '011f28e473c95f4013d7d53ec5fbc3b42df8ed10'
        ]
      ]

      for (const [addr, hash160] of cases) {
        const payload = addressToHash160(addr)
        assert.equal(payload.length, 20)
        assert.equal(payload.toString('hex'), hash160)
      }
    })

    it('does not byte-reverse the hash160', () => {
      const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
      const reversed = Buffer.from(
        'cb481232299cd5743151ac4b2d63ae198e7bb0a9',
        'hex'
      ).reverse().toString('hex')

      assert.notEqual(addressToHash160(addr).toString('hex'), reversed)
    })

    it('rejects malformed addresses', () => {
      for (const addr of ['not-an-address', 'bitcoincash:qznonsense', '1234567890']) {
        assert.throws(() => addressToHash160(addr), /valid cash address/)
      }
    })
  })
})
