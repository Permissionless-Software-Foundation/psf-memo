/*
  Unit tests for the pure follow-list helpers.

  The memo-following and memo-followers commands report an unpaginated list of
  cash addresses. These pin the required followee address, the wallet-source
  passthrough, and the human-readable summary.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  parseFollowingFlags,
  parseFollowersFlags,
  parseWalletSourceFlags,
  formatFollowListMessage,
  MISSING_FOLLOWEE_MESSAGE
} from '../../../src/lib/follow-list.js'
import { captureUsageError } from '../../support/usage-error.js'

describe('#follow-list helpers', () => {
  it('passes through the following wallet source', () => {
    assert.deepEqual(parseFollowingFlags({ name: 'wallet' }), { name: 'wallet', wif: null })
    assert.deepEqual(parseFollowingFlags({ wif: 'wif-key' }), { name: null, wif: 'wif-key' })
    assert.deepEqual(parseFollowingFlags({}), { name: null, wif: null })
  })

  it('normalizes a wallet source for any wallet-scoped list command', () => {
    assert.deepEqual(parseWalletSourceFlags({ name: 'wallet' }), { name: 'wallet', wif: null })
    assert.deepEqual(parseWalletSourceFlags({ wif: 'wif-key' }), { name: null, wif: 'wif-key' })
    assert.deepEqual(parseWalletSourceFlags({}), { name: null, wif: null })
  })

  it('requires the followee -a address', () => {
    const err = captureUsageError(() => parseFollowersFlags({}))
    assert.equal(err.message, MISSING_FOLLOWEE_MESSAGE)
    assert.equal(err.message, 'You must specify a followee address with the -a flag.')
  })

  it('resolves the followee address', () => {
    assert.deepEqual(parseFollowersFlags({ addr: 'addrA' }), { address: 'addrA' })
  })

  it('renders the following addresses and their count', () => {
    assert.equal(
      formatFollowListMessage(['addrB', 'addrC'], 'following'),
      'Read 2 following addresses\naddrB\naddrC'
    )
  })

  it('renders a single follower address with a singular noun', () => {
    assert.equal(
      formatFollowListMessage(['addrD'], 'follower'),
      'Read 1 follower address\naddrD'
    )
  })

  it('renders an empty list without address lines', () => {
    assert.equal(formatFollowListMessage([], 'follower'), 'Read 0 follower addresses')
  })
})
