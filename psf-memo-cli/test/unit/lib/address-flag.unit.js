/*
  Unit tests for the shared required -a address flag.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { parseAddressFlag } from '../../../src/lib/address-flag.js'
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
})
