/*
  Unit tests for the shared required -a address flag.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { parseAddressFlag, addressHash160FlagParser } from '../../../src/lib/address-flag.js'
import { captureUsageError } from '../../support/usage-error.js'

const MESSAGE = 'You must specify a profile address with the -a flag.'
const FOLLOWEE_MESSAGE = 'You must specify a followee address with the -a flag.'
const ADDR = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const HASH160 = '3e31055173cf58d56edb075499daf29d7b488f09'

describe('#address-flag', () => {
  const parse = addressHash160FlagParser(FOLLOWEE_MESSAGE)

  it('returns the supplied address', () => {
    assert.equal(parseAddressFlag({ addr: 'addrA' }, MESSAGE), 'addrA')
  })

  it('reports a missing or empty address with the supplied usage message', () => {
    assert.equal(captureUsageError(() => parseAddressFlag({}, MESSAGE)).message, MESSAGE)
    assert.equal(captureUsageError(() => parseAddressFlag({ addr: '' }, MESSAGE)).message, MESSAGE)
    assert.equal(captureUsageError(() => parse({})).message, FOLLOWEE_MESSAGE)
  })

  it('decodes the address to its 20-byte hash160 in display order', () => {
    const { hash160 } = parse({ addr: ADDR })

    assert.equal(hash160.length, 20)
    assert.equal(hash160.toString('hex'), HASH160)
  })

  it('reports a malformed address as a usage error', () => {
    const err = captureUsageError(() => parse({ addr: 'not-an-address' }))

    assert.equal(err.message, 'Address must be a valid cash address.')
  })
})
