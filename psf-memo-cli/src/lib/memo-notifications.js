/*
  Pure helpers for the memo-notifications read command.

  The command reads one page of the wallet address's notifications from
  psf-memo-db. This module owns the page defaults, the flag validation, and the
  human-readable summary, so the command is a thin wiring layer over the shared
  reporter and the read-only Memo DB client.
*/

// Local libraries
import { parseNonNegativeInteger } from './page-flags.js'
import { formatPageSummary } from './page-summary.js'

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
  return formatPageSummary(
    notifications,
    'notification',
    (notification) => {
      const target = notification.postTxid ? ` (post ${notification.postTxid})` : ''
      return `${notification.txid}: ${notification.type} from ${notification.addr}${target}`
    },
    pagination
  )
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-07T19:24:16.112Z","module_hash":"f25037e5c43e91eab8c585a6c30a638dfd5c26fb1808fc47e7c28437f5a669bc","functions":[{"id":"func/parseNotificationsFlags","name":"parseNotificationsFlags","line":18,"end_line":23,"hash":"3f7d18cedb74c147182cd111cae519f25fe1934b381193971efe11635f498bef"},{"id":"func/formatNotificationsMessage","name":"formatNotificationsMessage","line":28,"end_line":41,"hash":"65ed11fc3f9863686ebebdde8e157f0851a0a0cbbfd521a26ec7574d2e5178bb"}]}
// mutate4javascript-manifest-end
