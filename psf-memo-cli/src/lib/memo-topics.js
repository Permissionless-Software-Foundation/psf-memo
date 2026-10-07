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
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
