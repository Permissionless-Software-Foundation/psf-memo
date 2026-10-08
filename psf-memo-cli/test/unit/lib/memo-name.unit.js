/*
  Unit tests for the pure memo-name helper.

  The command broadcasts a 0x6d01 set-name action. This pins the protocol
  prefix, the 77-byte limit (bytes, not characters), the flag validation, and
  the human-readable summary.
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
import { captureUsageError } from '../../support/usage-error.js'

describe('#memo-name helper', () => {
  it('exposes the 0x6d01 prefix and the 77-byte limit', () => {
    assert.equal(MEMO_NAME_PREFIX, '6d01')
    assert.equal(MAX_NAME_BYTES, 77)
  })

  it('resolves a valid name', () => {
    assert.deepEqual(parseMemoNameFlags({ memo: 'trout' }), { name: 'trout' })
  })

  it('counts bytes, not characters, for the length limit', () => {
    assert.deepEqual(parseMemoNameFlags({ memo: 'é'.repeat(38) }), { name: 'é'.repeat(38) })

    const err = captureUsageError(() => parseMemoNameFlags({ memo: 'é'.repeat(39) }))
    assert.equal(err.message, 'Name is too long. Maximum is 77 bytes.')
  })

  it('requires the -m name', () => {
    const err = captureUsageError(() => parseMemoNameFlags({}))
    assert.equal(err.message, 'You must specify a name with the -m flag.')
  })

  it('rejects an empty name', () => {
    const err = captureUsageError(() => parseMemoNameFlags({ memo: '' }))
    assert.equal(err.message, 'Name must not be empty.')
  })

  it('renders the txid and explorer link', () => {
    const message = formatMemoNameMessage({ txid: 'abc', explorerUrl: 'https://bch.loping.net/tx/abc' })

    assert.include(message, 'abc')
    assert.include(message, 'https://bch.loping.net/tx/abc')
  })
})
