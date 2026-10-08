/*
  Pure helpers for the memo-topic read command.

  The command reads one page of a single topic's posts from psf-memo-db. This
  module owns the required room flag and the page defaults; the command is a
  thin wiring layer over the shared reporter, the shared post-page summary, and
  the read-only Memo DB client.
*/

// Local libraries
import { UsageError } from './reporter.js'
import { parseNonNegativeInteger } from './page-flags.js'

// The default page matches the web client and the DB route's own default.
export const DEFAULT_TOPIC_LIMIT = 50
export const DEFAULT_TOPIC_OFFSET = 0

// Resolve the required topic room, the optional viewer, and the post page from
// command-line flags. Throws a UsageError (exit 2) for a missing room or a bad
// --limit/--offset.
export function parseTopicFlags (flags = {}) {
  const room = flags.room

  if (!room) {
    throw new UsageError('You must specify a topic room with the -r flag.')
  }

  return {
    room,
    viewer: flags.viewer || null,
    limit: parseNonNegativeInteger(flags.limit, DEFAULT_TOPIC_LIMIT, '--limit'),
    offset: parseNonNegativeInteger(flags.offset, DEFAULT_TOPIC_OFFSET, '--offset')
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:56:02.984Z","module_hash":"8590d94f8a3a3a9c4dc7bcd8bb7f3d41806dfc812df4eb34fb5b155ec6efad7d","functions":[{"id":"func/parseTopicFlags","name":"parseTopicFlags","line":21,"end_line":34,"hash":"882599bf2a51a7eeb63cdb31e04564823be514d270625d10dbfddf81e716629a"}]}
// mutate4javascript-manifest-end
