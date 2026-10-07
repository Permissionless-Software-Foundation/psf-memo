/*
  Unit tests for the pure memo-posts helpers.

  The command reads one page of the top-level posts authored by an address. These
  pin the required -a address, the page defaults, and the flag validation.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  parsePostsFlags,
  DEFAULT_POSTS_LIMIT,
  DEFAULT_POSTS_OFFSET
} from '../../../src/lib/memo-posts.js'
import { UsageError } from '../../../src/lib/reporter.js'

function captureUsageError (fn) {
  try {
    fn()
  } catch (err) {
    assert.instanceOf(err, UsageError)
    return err
  }
  throw new Error('Expected a UsageError')
}

describe('#memo-posts helpers', () => {
  it('exposes the default page', () => {
    assert.equal(DEFAULT_POSTS_LIMIT, 50)
    assert.equal(DEFAULT_POSTS_OFFSET, 0)
  })

  it('requires the -a address', () => {
    const err = captureUsageError(() => parsePostsFlags({}))
    assert.equal(err.message, 'You must specify an author address with the -a flag.')
  })

  it('resolves the address with the default page', () => {
    assert.deepEqual(parsePostsFlags({ addr: 'addrA' }), {
      address: 'addrA',
      limit: 50,
      offset: 0
    })
  })

  it('resolves an explicit page', () => {
    assert.deepEqual(parsePostsFlags({ addr: 'addrA', limit: '2', offset: '4' }), {
      address: 'addrA',
      limit: 2,
      offset: 4
    })
  })

  it('rejects a non-negative-integer page violation', () => {
    const limit = captureUsageError(() => parsePostsFlags({ addr: 'addrA', limit: '-1' }))
    assert.equal(limit.message, '--limit must be a non-negative integer.')

    const offset = captureUsageError(() => parsePostsFlags({ addr: 'addrA', offset: 'abc' }))
    assert.equal(offset.message, '--offset must be a non-negative integer.')
  })
})
