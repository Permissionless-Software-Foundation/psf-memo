/*
  Unit tests for the pure memo-profiles helpers.

  The command reads one page of the recent-profiles list from psf-memo-db.
  These pin the page defaults, the flag validation, and the human-readable
  summary of each profile's identity and recency fields.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  parseProfilesFlags,
  formatProfilesMessage,
  DEFAULT_PROFILES_LIMIT,
  DEFAULT_PROFILES_OFFSET
} from '../../../src/lib/memo-profiles.js'
import { assertPageFlagViolations } from '../../support/usage-error.js'

describe('#memo-profiles helpers', () => {
  it('exposes the default page', () => {
    assert.equal(DEFAULT_PROFILES_LIMIT, 50)
    assert.equal(DEFAULT_PROFILES_OFFSET, 0)
  })

  it('resolves the default page when no flags are given', () => {
    assert.deepEqual(parseProfilesFlags({}), { limit: 50, offset: 0 })
  })

  it('parses an explicit page', () => {
    assert.deepEqual(parseProfilesFlags({ limit: '2', offset: '4' }), { limit: 2, offset: 4 })
  })

  it('rejects a non-negative-integer violation', () => {
    assertPageFlagViolations(parseProfilesFlags)
  })

  it('renders each profile and the pagination', () => {
    const message = formatProfilesMessage(
      [
        { addr: 'addrA', text: 'alice bio', name: 'alice', profilePicUrl: 'https://example.com/alice.png', txid: 'txA', blockHeight: 600300, seen: 300 },
        { addr: 'addrB', text: 'bob bio', name: null, profilePicUrl: 'https://example.com/bob.jpg', txid: 'txB', blockHeight: 600200, seen: 200 }
      ],
      { limit: 50, offset: 0, total: 2, hasMore: false }
    )

    assert.include(message, 'Read 2 profiles')
    assert.include(message, 'addrA: alice, avatar https://example.com/alice.png, bio alice bio')
    assert.include(message, 'addrB: (unset), avatar https://example.com/bob.jpg, bio bob bio')
    assert.include(message, 'pagination: limit 50, offset 0, total 2, hasMore false')
  })

  it('renders (unset) for a profile with no avatar or bio', () => {
    const message = formatProfilesMessage(
      [
        { addr: 'addrC', text: '', name: 'carol', profilePicUrl: '', txid: 'txC', blockHeight: 600100, seen: 100 }
      ],
      { limit: 50, offset: 0, total: 1, hasMore: false }
    )

    assert.include(
      message,
      'addrC: carol, avatar (unset), bio (unset), txid txC, blockHeight 600100, seen 100'
    )
  })
})
