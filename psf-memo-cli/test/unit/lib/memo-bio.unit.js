/*
  Unit tests for the pure memo-bio helper.

  The command broadcasts a 0x6d05 set-profile-text action. This pins the
  protocol prefix, the 217-byte limit (bytes, not characters), the shared -m
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
import { defineMemoTextFlagTests } from '../../support/memo-text-flag-tests.js'

describe('#memo-bio helper', () => {
  it('exposes the 0x6d05 prefix and the 217-byte limit', () => {
    assert.equal(MEMO_BIO_PREFIX, '6d05')
    assert.equal(MAX_BIO_BYTES, 217)
  })

  defineMemoTextFlagTests({
    label: 'Bio',
    parse: parseMemoBioFlags,
    field: 'bio',
    atLimit: 'a'.repeat(MAX_BIO_BYTES),
    overLimit: 'é'.repeat(109),
    missingMessage: 'You must specify bio text with the -m flag.',
    tooLongMessage: 'Bio is too long. Maximum is 217 bytes.'
  })

  it('renders the txid and explorer link', () => {
    const message = formatMemoBioMessage({ txid: 'abc', explorerUrl: 'https://bch.loping.net/tx/abc' })

    assert.include(message, 'abc')
    assert.include(message, 'https://bch.loping.net/tx/abc')
  })
})
