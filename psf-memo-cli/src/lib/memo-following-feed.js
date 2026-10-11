/*
  Pure helpers for the memo-following-feed read command.

  The command reads one page of the viewer's Following feed -- the top-level
  posts authored by the profiles the viewer follows -- from psf-memo-db. This
  module owns the page defaults and flag validation; the command is a thin
  wiring layer over the shared reporter and the read-only Memo DB client.
*/

// Local libraries
import { parseNonNegativeInteger } from './page-flags.js'

// The default page matches the web client and the DB route's own default.
export const DEFAULT_FOLLOWING_FEED_LIMIT = 50
export const DEFAULT_FOLLOWING_FEED_OFFSET = 0

// Resolve the Following feed page from command-line flags.
export function parseFollowingFeedFlags (flags = {}) {
  return {
    limit: parseNonNegativeInteger(flags.limit, DEFAULT_FOLLOWING_FEED_LIMIT, '--limit'),
    offset: parseNonNegativeInteger(flags.offset, DEFAULT_FOLLOWING_FEED_OFFSET, '--offset')
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T18:21:11.271Z","module_hash":"be4bda9124c4dc42fde975b730ff0758567e4c4f43cf55d530dd6139394bb904","functions":[{"id":"func/parseFollowingFeedFlags","name":"parseFollowingFeedFlags","line":18,"end_line":23,"hash":"9cf2aed9e573e28f5344373da95c84fef381892cbceb18722c82f77f34c563cc"}]}
// mutate4javascript-manifest-end
