/*
  Unit tests for the shared required -r topic room flag.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { parseRoomFlag, MISSING_ROOM_MESSAGE } from '../../../src/lib/room-flag.js'
import { captureUsageError } from '../../support/usage-error.js'

describe('#room-flag', () => {
  it('exposes the documented missing-room message', () => {
    assert.equal(MISSING_ROOM_MESSAGE, 'You must specify a topic room with the -r flag.')
  })

  it('resolves the room', () => {
    assert.equal(parseRoomFlag({ room: 'general' }), 'general')
  })

  it('reports a missing or empty room as a usage error', () => {
    assert.equal(captureUsageError(() => parseRoomFlag({})).message, MISSING_ROOM_MESSAGE)
    assert.equal(captureUsageError(() => parseRoomFlag({ room: '' })).message, MISSING_ROOM_MESSAGE)
  })
})
