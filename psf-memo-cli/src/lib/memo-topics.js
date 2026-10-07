/*
  Pure helpers for the memo-topics read command.

  The command reads one page of the topic list from psf-memo-db. This module
  owns the page defaults, the flag validation, and the human-readable summary,
  so the command is a thin wiring layer over the shared reporter and the
  read-only Memo DB client.
*/

// Local libraries
import { parseNonNegativeInteger } from './page-flags.js'
import { formatPageSummary } from './page-summary.js'

// The default page matches the web client and the DB route's own default.
export const DEFAULT_TOPICS_LIMIT = 50
export const DEFAULT_TOPICS_OFFSET = 0

// Resolve the topic page from command-line flags.
export function parseTopicsFlags (flags = {}) {
  return {
    limit: parseNonNegativeInteger(flags.limit, DEFAULT_TOPICS_LIMIT, '--limit'),
    offset: parseNonNegativeInteger(flags.offset, DEFAULT_TOPICS_OFFSET, '--offset')
  }
}

// Render the human-readable topics summary: the topic count, one line per topic
// (room, post count, follower count, last-post time), then the service
// pagination unchanged.
export function formatTopicsMessage (topics = [], pagination = {}) {
  return formatPageSummary(
    topics,
    'topic',
    (topic) => `${topic.room}: ${topic.postCount} posts, ${topic.followerCount} followers, lastSeen ${topic.lastSeen}`,
    pagination
  )
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-07T20:54:28.145Z","module_hash":"812ba4edb5352e625444db7c487814b01c0ea4aa87f2b81dfc0da8d8dbd03ac4","functions":[{"id":"func/parseTopicsFlags","name":"parseTopicsFlags","line":19,"end_line":24,"hash":"5d2f0797ba0185023f12ba07500f45713a3214fa96141147575ebecd8435a34c"},{"id":"func/formatTopicsMessage","name":"formatTopicsMessage","line":29,"end_line":36,"hash":"c9803fd53419db53903938056aef895c0ec51ead5ecb34989bf3652e2b6dd933"}]}
// mutate4javascript-manifest-end
