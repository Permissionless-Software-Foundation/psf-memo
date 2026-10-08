/*
  Unit tests for the shared required -a address flag.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { parseAddressFlag, addressHash160FlagParser } from '../../../src/lib/address-flag.js'
import { UsageError } from '../../../src/lib/reporter.js'

const MESSAGE = 'You must specify a profile address with the -a flag.'

describe('#address-flag', () => {
  it('returns the supplied address', () => {
    assert.equal(parseAddressFlag({ addr: 'addrA' }, MESSAGE), 'addrA')
  })

  it('throws the supplied usage message when the address is missing', () => {
    let err
    try {
      parseAddressFlag({}, MESSAGE)
    } catch (e) {
      err = e
    }
    assert.instanceOf(err, UsageError)
    assert.equal(err.message, MESSAGE)
  })

  it('treats an empty address as missing', () => {
    assert.throws(() => parseAddressFlag({ addr: '' }, MESSAGE), UsageError)
  })

  describe('addressHash160FlagParser', () => {
    const parse = addressHash160FlagParser('You must specify a followee address with the -a flag.')

    it('decodes the address to its 20-byte hash160 in display order', () => {
      const { hash160 } = parse({ addr: 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d' })

      assert.equal(hash160.length, 20)
      assert.equal(hash160.toString('hex'), '3e31055173cf58d56edb075499daf29d7b488f09')
    })

    it('reports a missing address with the supplied usage message', () => {
      let err
      try {
        parse({})
      } catch (e) {
        err = e
      }
      assert.instanceOf(err, UsageError)
      assert.equal(err.message, 'You must specify a followee address with the -a flag.')
    })

    it('reports a malformed address as a usage error', () => {
      let err
      try {
        parse({ addr: 'not-an-address' })
      } catch (e) {
        err = e
      }
      assert.instanceOf(err, UsageError)
      assert.equal(err.message, 'Address must be a valid cash address.')
    })
  })
})
