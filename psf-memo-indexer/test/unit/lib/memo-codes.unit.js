/*
  Unit tests for the Memo protocol action codes and prefix helpers.
*/

import { assert } from 'chai'
import {
  CODE_PREFIX,
  CODE_SET_NAME,
  CODE_CREATE_POLL,
  CODE_ADD_POLL_OPTION,
  CODE_POLL_VOTE,
  PREFIX_CREATE_POLL,
  PREFIX_ADD_POLL_OPTION,
  PREFIX_POLL_VOTE,
  TX_HASH_LENGTH,
  isMemoPrefix,
  getActionFromPrefix
} from '../../../src/lib/memo-codes.js'

describe('memo-codes', () => {
  it('should expose the poll action codes', () => {
    assert.equal(CODE_PREFIX, 0x6d)
    assert.equal(CODE_SET_NAME, 0x01)
    assert.equal(CODE_CREATE_POLL, 0x10)
    assert.equal(CODE_ADD_POLL_OPTION, 0x13)
    assert.equal(CODE_POLL_VOTE, 0x14)
    assert.equal(TX_HASH_LENGTH, 32)
  })

  it('should build the poll prefixes from the code prefix', () => {
    assert.deepEqual(PREFIX_CREATE_POLL, Buffer.from([0x6d, 0x10]))
    assert.deepEqual(PREFIX_ADD_POLL_OPTION, Buffer.from([0x6d, 0x13]))
    assert.deepEqual(PREFIX_POLL_VOTE, Buffer.from([0x6d, 0x14]))
  })

  it('should recognize a valid two-byte memo prefix', () => {
    assert.isTrue(isMemoPrefix(Buffer.from([0x6d, 0x10])))
  })

  it('should reject a single-byte buffer', () => {
    assert.isFalse(isMemoPrefix(Buffer.from([0x6d])))
  })

  it('should reject a buffer that does not start with the code prefix', () => {
    assert.isFalse(isMemoPrefix(Buffer.from([0x00, 0x10])))
  })

  it('should reject a null buffer', () => {
    assert.isNotOk(isMemoPrefix(null))
  })

  it('should map a poll prefix to its action name', () => {
    assert.equal(getActionFromPrefix(Buffer.from([0x6d, 0x10])), 'createPoll')
    assert.equal(getActionFromPrefix(Buffer.from([0x6d, 0x13])), 'addPollOption')
    assert.equal(getActionFromPrefix(Buffer.from([0x6d, 0x14])), 'pollVote')
  })

  it('should return null for an unknown prefix', () => {
    assert.equal(getActionFromPrefix(Buffer.from([0x6d, 0xff])), null)
  })
})
