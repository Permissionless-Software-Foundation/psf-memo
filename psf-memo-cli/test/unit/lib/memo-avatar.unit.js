/*
  Unit tests for the pure memo-avatar helper.

  The command broadcasts a 0x6d0a set-profile-picture action. This pins the
  protocol prefix, the 217-byte limit (bytes, not characters), the shared -u
  validation, and the human-readable summary.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  parseMemoAvatarFlags,
  formatMemoAvatarMessage,
  MEMO_AVATAR_PREFIX,
  MAX_AVATAR_BYTES
} from '../../../src/lib/memo-avatar.js'
import { defineMemoTextFlagTests } from '../../support/memo-text-flag-tests.js'

describe('#memo-avatar helper', () => {
  it('exposes the 0x6d0a prefix and the 217-byte limit', () => {
    assert.equal(MEMO_AVATAR_PREFIX, '6d0a')
    assert.equal(MAX_AVATAR_BYTES, 217)
  })

  defineMemoTextFlagTests({
    flag: 'url',
    label: 'Avatar URL',
    parse: parseMemoAvatarFlags,
    field: 'url',
    atLimit: 'a'.repeat(MAX_AVATAR_BYTES),
    overLimit: 'é'.repeat(109),
    missingMessage: 'You must specify an avatar URL with the -u flag.',
    tooLongMessage: 'Avatar URL is too long. Maximum is 217 bytes.'
  })

  it('renders the txid and explorer link', () => {
    const message = formatMemoAvatarMessage({ txid: 'abc', explorerUrl: 'https://bch.loping.net/tx/abc' })

    assert.include(message, 'abc')
    assert.include(message, 'https://bch.loping.net/tx/abc')
  })
})
