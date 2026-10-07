/*
  Pure helpers for the memo-feed read command.

  The command reads one page of the recent top-level Memo feed from psf-memo-db.
  This module owns the page defaults, flag validation, and the human-readable
  summary, so the command itself is a thin wiring layer over the shared
  reporter and the read-only Memo DB client.
*/

// Local libraries
import { parseNonNegativeInteger } from './page-flags.js'
import { formatReadCount, formatPagination } from './page-summary.js'

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
  const lines = [formatReadCount(posts.length, 'post')]

  for (const post of posts) {
    lines.push(
      `${post.txid}: ${post.text} (replies ${post.replyCount}, likes ${post.likeCount})`
    )
  }

  lines.push(formatPagination(pagination))

  return lines.join('\n')
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-07T19:25:00.486Z","module_hash":"0831c4cf523210ba5d19d2cc1e6c0adade7819f67105b7cb33f9958a5e122098","functions":[{"id":"func/parseFeedFlags","name":"parseFeedFlags","line":18,"end_line":24,"hash":"139a05f5921133012a6b862aa435cf6885f5acc00ec9aa2ecb764bddee3f3cd2"},{"id":"func/formatFeedMessage","name":"formatFeedMessage","line":28,"end_line":42,"hash":"a9a51f74202031c461c1a19e44658ef8b06f6547cf2e24ae4f36bbadb31600e5"}]}
// mutate4javascript-manifest-end
