/*
  Unit tests for the pure memo-notifications helpers.

  The command reads one page of the wallet address's notifications from
  psf-memo-db. These pin the page defaults, the flag validation, and the
  human-readable summary.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  parseNotificationsFlags,
  formatNotificationsMessage,
  DEFAULT_NOTIFICATIONS_LIMIT,
  DEFAULT_NOTIFICATIONS_OFFSET
} from '../../../src/lib/memo-notifications.js'
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

describe('#memo-notifications helpers', () => {
  it('exposes the default page', () => {
    assert.equal(DEFAULT_NOTIFICATIONS_LIMIT, 50)
    assert.equal(DEFAULT_NOTIFICATIONS_OFFSET, 0)
  })

  it('resolves the default page when no flags are given', () => {
    assert.deepEqual(parseNotificationsFlags({}), { limit: 50, offset: 0 })
  })

  it('parses an explicit page', () => {
    assert.deepEqual(parseNotificationsFlags({ limit: '2', offset: '4' }), { limit: 2, offset: 4 })
  })

  it('rejects a non-negative-integer violation', () => {
    const limit = captureUsageError(() => parseNotificationsFlags({ limit: '-1' }))
    assert.equal(limit.message, '--limit must be a non-negative integer.')

    const offset = captureUsageError(() => parseNotificationsFlags({ offset: 'abc' }))
    assert.equal(offset.message, '--offset must be a non-negative integer.')
  })

  it('renders the notifications and the pagination', () => {
    const message = formatNotificationsMessage(
      [
        { txid: 'notif-1', type: 'follow', addr: 'followerA' },
        { txid: 'notif-2', type: 'reply', addr: 'replier', postTxid: 'post-x', text: 'hi' }
      ],
      { limit: 50, offset: 0, total: 2, hasMore: false }
    )

    assert.include(message, 'Read 2 notifications')
    assert.include(message, 'notif-1')
    assert.include(message, 'follow')
    assert.include(message, 'followerA')
    assert.include(message, 'notif-2')
    assert.include(message, 'pagination: limit 50, offset 0, total 2, hasMore false')
  })

  it('singularizes a single notification', () => {
    const message = formatNotificationsMessage(
      [{ txid: 'notif-1', type: 'like', addr: 'liker' }],
      { limit: 50, offset: 0, total: 1, hasMore: false }
    )

    assert.include(message, 'Read 1 notification\n')
  })
})
