/*
  Unit tests for the pure memo-name helper.

  The command broadcasts a 0x6d01 set-name action. This pins the protocol
  prefix, the 77-byte limit (bytes, not characters), the shared -m validation,
  and the human-readable summary.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  parseMemoNameFlags,
  formatMemoNameMessage,
  MEMO_NAME_PREFIX,
  MAX_NAME_BYTES
} from '../../../src/lib/memo-name.js'
import { defineMemoTextFlagTests } from '../../support/memo-text-flag-tests.js'

describe('#memo-name helper', () => {
  it('exposes the 0x6d01 prefix and the 77-byte limit', () => {
    assert.equal(MEMO_NAME_PREFIX, '6d01')
    assert.equal(MAX_NAME_BYTES, 77)
  })

  defineMemoTextFlagTests({
    label: 'Name',
    parse: parseMemoNameFlags,
    field: 'name',
    atLimit: 'a'.repeat(MAX_NAME_BYTES),
    overLimit: 'é'.repeat(39),
    missingMessage: 'You must specify a name with the -m flag.',
    tooLongMessage: 'Name is too long. Maximum is 77 bytes.'
  })

  it('renders the txid and explorer link', () => {
    const message = formatMemoNameMessage({ txid: 'abc', explorerUrl: 'https://bch.loping.net/tx/abc' })

    assert.include(message, 'abc')
    assert.include(message, 'https://bch.loping.net/tx/abc')
  })
})
