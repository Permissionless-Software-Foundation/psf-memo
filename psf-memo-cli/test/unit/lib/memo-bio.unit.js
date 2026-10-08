/*
  Unit tests for the pure memo-bio helper.

  The command broadcasts a 0x6d05 set-profile-text action. This pins the
  protocol prefix, the 217-byte limit (bytes, not characters), the flag
  validation, and the human-readable summary.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  parseMemoBioFlags,
  formatMemoBioMessage,
  MEMO_BIO_PREFIX,
  MAX_BIO_BYTES
} from '../../../src/lib/memo-bio.js'
import { captureUsageError } from '../../support/usage-error.js'

describe('#memo-bio helper', () => {
  it('exposes the 0x6d05 prefix and the 217-byte limit', () => {
    assert.equal(MEMO_BIO_PREFIX, '6d05')
    assert.equal(MAX_BIO_BYTES, 217)
  })

  it('resolves a valid bio', () => {
    assert.deepEqual(parseMemoBioFlags({ memo: 'hello' }), { bio: 'hello' })
  })

  it('counts bytes, not characters, for the length limit', () => {
    assert.deepEqual(parseMemoBioFlags({ memo: 'é'.repeat(108) }), { bio: 'é'.repeat(108) })

    const err = captureUsageError(() => parseMemoBioFlags({ memo: 'é'.repeat(109) }))
    assert.equal(err.message, 'Bio is too long. Maximum is 217 bytes.')
  })

  it('requires the -m bio text', () => {
    const err = captureUsageError(() => parseMemoBioFlags({}))
    assert.equal(err.message, 'You must specify bio text with the -m flag.')
  })

  it('rejects an empty bio', () => {
    const err = captureUsageError(() => parseMemoBioFlags({ memo: '' }))
    assert.equal(err.message, 'Bio must not be empty.')
  })

  it('renders the txid and explorer link', () => {
    const message = formatMemoBioMessage({ txid: 'abc', explorerUrl: 'https://bch.loping.net/tx/abc' })

    assert.include(message, 'abc')
    assert.include(message, 'https://bch.loping.net/tx/abc')
  })
})
