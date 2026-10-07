/*
  Pure helpers for the memo-notifications read command.

  The command reads one page of the wallet address's notifications from
  psf-memo-db. This module owns the page defaults, the flag validation, and the
  human-readable summary, so the command is a thin wiring layer over the shared
  reporter and the read-only Memo DB client.
*/

// Local libraries
import { parseNonNegativeInteger } from './page-flags.js'

// The default page matches the web client and the DB route's own default.
export const DEFAULT_NOTIFICATIONS_LIMIT = 50
export const DEFAULT_NOTIFICATIONS_OFFSET = 0

// Resolve the notification page from command-line flags.
export function parseNotificationsFlags (flags = {}) {
  return {
    limit: parseNonNegativeInteger(flags.limit, DEFAULT_NOTIFICATIONS_LIMIT, '--limit'),
    offset: parseNonNegativeInteger(flags.offset, DEFAULT_NOTIFICATIONS_OFFSET, '--offset')
  }
}

// Render the human-readable notifications summary: the notification count, one
// line per notification (txid, type, actor, and the liked/replied post), then
// the service pagination unchanged.
export function formatNotificationsMessage (notifications = [], pagination = {}) {
  const lines = [`Read ${notifications.length} notification${notifications.length === 1 ? '' : 's'}`]

  for (const notification of notifications) {
    const target = notification.postTxid ? ` (post ${notification.postTxid})` : ''
    lines.push(`${notification.txid}: ${notification.type} from ${notification.addr}${target}`)
  }

  lines.push(
    `pagination: limit ${pagination.limit}, offset ${pagination.offset}, total ${pagination.total}, hasMore ${pagination.hasMore}`
  )

  return lines.join('\n')
}

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
