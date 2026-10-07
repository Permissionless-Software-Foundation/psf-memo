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
// {"version":1,"tested_at":"2026-10-07T20:55:24.157Z","module_hash":"caff951442ef9ab211e5a6a5c16630764202eaf3f256b2cabdedcea94bc9852f","functions":[{"id":"func/parseNotificationsFlags","name":"parseNotificationsFlags","line":19,"end_line":24,"hash":"3f7d18cedb74c147182cd111cae519f25fe1934b381193971efe11635f498bef"},{"id":"func/formatNotificationsMessage","name":"formatNotificationsMessage","line":29,"end_line":39,"hash":"f0587dbd8b9e7b88cea97354e5c995156f049442a929c673c95facc858d84ea2"}]}
// mutate4javascript-manifest-end
