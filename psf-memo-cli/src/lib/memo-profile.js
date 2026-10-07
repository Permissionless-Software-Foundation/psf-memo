/*
  Pure helpers for the memo-profile read command.

  The command composes a target address's Memo identity (name, profile text,
  avatar), one page of the address's top-level posts, and the viewer's follow
  state. This module owns the required address flag, the page defaults, and the
  human-readable summary; the command is a thin wiring layer over the shared
  reporter and the read-only Memo DB client.
*/

// Local libraries
import { UsageError } from './reporter.js'
import { parseNonNegativeInteger } from './page-flags.js'
import { formatFeedMessage } from './memo-feed.js'

// The default page matches the web client and the DB route's own default.
export const DEFAULT_PROFILE_LIMIT = 50
export const DEFAULT_PROFILE_OFFSET = 0

// Resolve the required profile address, the optional viewer, and the post page
// from command-line flags. Throws a UsageError (exit 2) for a missing address or
// a bad --limit/--offset.
export function parseProfileFlags (flags = {}) {
  const address = flags.addr

  if (!address) {
    throw new UsageError('You must specify a profile address with the -a flag.')
  }

  return {
    address,
    viewer: flags.viewer || null,
    limit: parseNonNegativeInteger(flags.limit, DEFAULT_PROFILE_LIMIT, '--limit'),
    offset: parseNonNegativeInteger(flags.offset, DEFAULT_PROFILE_OFFSET, '--offset')
  }
}

// Render the human-readable profile summary: the identity and follow state,
// then the shared post-page summary (posts and pagination unchanged).
export function formatProfileMessage ({
  address,
  name,
  bio,
  avatar,
  posts = [],
  pagination = {},
  following
} = {}) {
  return [
    `address: ${address}`,
    `name: ${name || '(unset)'}`,
    `bio: ${bio || '(unset)'}`,
    `avatar: ${avatar || '(unset)'}`,
    `following: ${following}`,
    formatFeedMessage(posts, pagination)
  ].join('\n')
}

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
