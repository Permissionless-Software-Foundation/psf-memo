/*
  Unit tests for the pure memo-status helper.

  The command reports the psf-memo-db indexer's sync state; this pins the
  human-readable summary of the three block heights.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { formatStatusMessage } from '../../../src/lib/memo-status.js'

describe('#memo-status helpers', () => {
  it('renders the start, synced, and chain block heights', () => {
    const message = formatStatusMessage({
      startBlockHeight: 524999,
      syncedBlockHeight: 800000,
      chainBlockHeight: 800001
    })

    assert.include(message, '524999')
    assert.include(message, '800000')
    assert.include(message, '800001')
  })

  it('renders zeros for a not-yet-synced indexer', () => {
    const message = formatStatusMessage({
      startBlockHeight: 0,
      syncedBlockHeight: 0,
      chainBlockHeight: 750000
    })

    assert.include(message, '750000')
  })
})
