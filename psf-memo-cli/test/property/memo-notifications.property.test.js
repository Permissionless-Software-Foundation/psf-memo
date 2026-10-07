/*
  Property tests for the memo-notifications read-command helpers and wiring.

  Unit tests pin a few fixed pages and flags. These properties exercise broad
  input ranges to confirm:

    - numeric identity: a non-negative integer flag parses back to that integer,
      while absent or empty flags fall back to the documented defaults.
    - rejection: any value that is not a non-negative integer is a UsageError
      naming the exact flag.
    - summary fidelity: the human summary lists every notification in order and
      carries the pagination unchanged.
    - command fidelity: JSON mode reports the service page (notifications and
      pagination) unchanged.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom, intGen } from './harness.js'
import MemoNotifications from '../../src/commands/memo-notifications.js'
import { captureStream } from '../support/capture.js'
import {
  DEFAULT_NOTIFICATIONS_LIMIT,
  DEFAULT_NOTIFICATIONS_OFFSET,
  parseNotificationsFlags,
  formatNotificationsMessage
} from '../../src/lib/memo-notifications.js'
import { UsageError } from '../../src/lib/reporter.js'

const rng = seededRandom(20261019)
const FLAG_MAX = 1000000
const randomLimit = intGen(rng, 0, FLAG_MAX)
const randomOffset = intGen(rng, 0, FLAG_MAX)

// A value that must be rejected by a non-negative-integer flag.
function invalidFlagValue () {
  const roll = rng()
  if (roll < 0.3) return String(-(1 + Math.floor(rng() * FLAG_MAX)))
  if (roll < 0.6) return `${Math.floor(rng() * 100)}.${Math.floor(rng() * 100)}`
  if (roll < 0.8) return rng() < 0.5 ? 'NaN' : 'Infinity'
  return `x${Math.floor(rng() * 100)}`
}

function randomNotification (index) {
  const type = ['follow', 'like', 'reply'][Math.floor(rng() * 3)]
  const notification = {
    txid: `notif-${index}-${Math.floor(rng() * 1e9).toString(16)}`,
    type,
    addr: `actor-${Math.floor(rng() * 1e9).toString(16)}`
  }
  if (type === 'reply') notification.text = 'a reply'
  if (type !== 'follow') notification.postTxid = `post-${index}`
  return notification
}

function randomPage (maxNotifications = 12) {
  const count = Math.floor(rng() * (maxNotifications + 1))
  const notifications = []
  for (let i = 0; i < count; i++) notifications.push(randomNotification(i))
  const pagination = {
    limit: randomLimit(),
    offset: randomOffset(),
    total: Math.floor(rng() * FLAG_MAX),
    hasMore: rng() < 0.5
  }
  return { notifications, pagination }
}

test('parseNotificationsFlags parses non-negative integer flags and defaults', () => {
  for (let i = 0; i < 500; i++) {
    const limit = randomLimit()
    const offset = randomOffset()

    const flags = parseNotificationsFlags({ limit: String(limit), offset: String(offset) })

    assert.equal(flags.limit, limit)
    assert.equal(flags.offset, offset)
  }

  for (const value of [undefined, null, '']) {
    const flags = parseNotificationsFlags({ limit: value, offset: value })
    assert.equal(flags.limit, DEFAULT_NOTIFICATIONS_LIMIT)
    assert.equal(flags.offset, DEFAULT_NOTIFICATIONS_OFFSET)
  }
})

test('parseNotificationsFlags rejects every violation with a named UsageError', () => {
  for (let i = 0; i < 500; i++) {
    const flag = rng() < 0.5 ? '--limit' : '--offset'
    const value = invalidFlagValue()

    assert.throws(
      () => parseNotificationsFlags({ [flag.slice(2)]: value }),
      (err) => err instanceof UsageError && err.message.includes(flag),
      `should reject ${flag}=${JSON.stringify(value)}`
    )
  }
})

test('formatNotificationsMessage lists every notification in order and carries pagination', () => {
  for (let i = 0; i < 300; i++) {
    const { notifications, pagination } = randomPage()

    const message = formatNotificationsMessage(notifications, pagination)

    assert.match(message, new RegExp(`^Read ${notifications.length} notification`))

    let cursor = -1
    for (const notification of notifications) {
      const at = message.indexOf(notification.txid)
      assert.ok(at > cursor, `notification ${notification.txid} should appear after the previous one`)
      cursor = at
      assert.ok(message.includes(notification.type))
      assert.ok(message.includes(notification.addr))
    }

    assert.ok(message.includes(`total ${pagination.total}`))
    assert.ok(message.includes(`hasMore ${pagination.hasMore}`))
  }
})

test('memo-notifications JSON mode reports the service page verbatim', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 120; i++) {
      const { notifications, pagination } = randomPage(10)
      const servicePage = { notifications, pagination }

      class FakeMemoDb {
        async getNotifications () {
          return servicePage
        }
      }
      const walletUtil = {
        instanceWallet: async () => ({ walletInfo: { cashAddress: 'addrA' } }),
        instanceWalletFromWif: async () => ({ walletInfo: { cashAddress: 'addrA' } })
      }

      const out = captureStream()
      const command = new MemoNotifications({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        walletUtil,
        stdout: out.stream,
        stderr: captureStream().stream
      })

      const code = await command.run({ json: true, name: 'wallet1' })

      assert.equal(code, 0)
      assert.deepEqual(JSON.parse(out.text()), {
        message: formatNotificationsMessage(notifications, pagination),
        notifications,
        pagination
      })
    }
  } finally {
    process.exitCode = originalExitCode
  }
})
