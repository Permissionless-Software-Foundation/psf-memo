/*
  Pure helpers for the memo-feed read command.

  The command reads one page of the recent top-level Memo feed from psf-memo-db.
  This module owns the page defaults, flag validation, and the human-readable
  summary, so the command itself is a thin wiring layer over the shared
  reporter and the read-only Memo DB client.
*/

// Local libraries
import { parseNonNegativeInteger } from './page-flags.js'
import { formatPageSummary } from './page-summary.js'

// The default page matches the web client and the DB route's own default.
export const DEFAULT_FEED_LIMIT = 50
export const DEFAULT_FEED_OFFSET = 0

// Resolve the feed page from command-line flags.
export function parseFeedFlags (flags = {}) {
  return {
    limit: parseNonNegativeInteger(flags.limit, DEFAULT_FEED_LIMIT, '--limit'),
    offset: parseNonNegativeInteger(flags.offset, DEFAULT_FEED_OFFSET, '--offset'),
    viewer: flags.viewer || null
  }
}

// Render the human-readable feed summary: the post count, one line per post
// (txid, text, reply and like counts), then the service pagination unchanged.
export function formatFeedMessage (posts = [], pagination = {}) {
  return formatPageSummary(
    posts,
    'post',
    (post) => `${post.txid}: ${post.text} (replies ${post.replyCount}, likes ${post.likeCount})`,
    pagination
  )
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T16:08:23.555Z","module_hash":"7ef48b9b6ad2d0216cc95953e3bb0114c835b647226c57f37f26cf0cec55fe72","functions":[{"id":"func/parseFeedFlags","name":"parseFeedFlags","line":19,"end_line":25,"hash":"139a05f5921133012a6b862aa435cf6885f5acc00ec9aa2ecb764bddee3f3cd2"},{"id":"func/formatFeedMessage","name":"formatFeedMessage","line":29,"end_line":36,"hash":"402cae9e2e8b6e07e1d7a9144418e0e6e87c04dfd2703b18567c8a04f7a0a5b7"}]}
// mutate4javascript-manifest-end
