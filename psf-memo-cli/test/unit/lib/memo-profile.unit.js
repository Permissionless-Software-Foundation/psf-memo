/*
  Unit tests for the pure memo-profile helpers.

  The command reads a composed profile for a target address: identity fields,
  one page of the address's posts, and the viewer's follow state. These pin the
  required -a address, the page defaults, the optional viewer, and the summary.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  parseProfileFlags,
  formatProfileMessage,
  DEFAULT_PROFILE_LIMIT,
  DEFAULT_PROFILE_OFFSET
} from '../../../src/lib/memo-profile.js'
import { UsageError } from '../../../src/lib/reporter.js'

const PROFILE_ADDRESS_ERROR =
  'You must specify a profile address with the -a flag.'

function captureUsageError (fn) {
  try {
    fn()
  } catch (err) {
    assert.instanceOf(err, UsageError)
    return err
  }
  throw new Error('Expected a UsageError')
}

describe('#memo-profile helpers', () => {
  it('exposes the default page', () => {
    assert.equal(DEFAULT_PROFILE_LIMIT, 50)
    assert.equal(DEFAULT_PROFILE_OFFSET, 0)
  })

  it('requires the -a address', () => {
    const err = captureUsageError(() => parseProfileFlags({}))
    assert.equal(err.message, PROFILE_ADDRESS_ERROR)
  })

  it('resolves the address with the default page and no viewer', () => {
    assert.deepEqual(parseProfileFlags({ addr: 'addrA' }), {
      address: 'addrA',
      viewer: null,
      limit: 50,
      offset: 0
    })
  })

  it('resolves an explicit page and viewer', () => {
    assert.deepEqual(parseProfileFlags({ addr: 'addrA', viewer: 'viewerB', limit: '2', offset: '4' }), {
      address: 'addrA',
      viewer: 'viewerB',
      limit: 2,
      offset: 4
    })
  })

  it('rejects a non-negative-integer page violation', () => {
    const limit = captureUsageError(() => parseProfileFlags({ addr: 'addrA', limit: '-1' }))
    assert.equal(limit.message, '--limit must be a non-negative integer.')
  })

  it('renders the identity, posts, and pagination', () => {
    const message = formatProfileMessage({
      address: 'addrA',
      name: 'alice',
      bio: 'hello memo',
      avatar: 'https://example/a.png',
      posts: [{ txid: 'alpha', text: 'first', replyCount: 1, likeCount: 2 }],
      pagination: { limit: 50, offset: 0, total: 1, hasMore: false },
      following: true
    })

    assert.include(message, 'address: addrA')
    assert.include(message, 'name: alice')
    assert.include(message, 'bio: hello memo')
    assert.include(message, 'avatar: https://example/a.png')
    assert.include(message, 'following: true')
    assert.include(message, 'Read 1 post')
    assert.include(message, 'alpha: first (replies 1, likes 2)')
    assert.include(message, 'pagination: limit 50, offset 0, total 1, hasMore false')
  })

  it('marks unset identity fields', () => {
    const message = formatProfileMessage({
      address: 'addrC',
      name: '',
      bio: '',
      avatar: '',
      posts: [],
      pagination: {},
      following: false
    })

    assert.include(message, 'name: (unset)')
    assert.include(message, 'bio: (unset)')
    assert.include(message, 'avatar: (unset)')
  })
})
