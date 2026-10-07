/*
  Pure helpers for the memo-feed read command.

  The command reads one page of the recent top-level Memo feed from psf-memo-db.
  This module owns the page defaults, flag validation, and the human-readable
  summary, so the command itself is a thin wiring layer over the shared
  reporter and the read-only Memo DB client.
*/

// Local libraries
import { UsageError } from './reporter.js'

// The default page matches the web client and the DB route's own default.
export const DEFAULT_FEED_LIMIT = 50
export const DEFAULT_FEED_OFFSET = 0

// Parse a non-negative integer flag, falling back when it is absent. A bad
// value is a usage error so the caller exits 2 and names the exact flag.
function parseNonNegativeInteger (value, fallback, flag) {
  if (value === undefined || value === null || value === '') return fallback

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new UsageError(`${flag} must be a non-negative integer.`)
  }
  return parsed
}

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
  const lines = [`Read ${posts.length} post${posts.length === 1 ? '' : 's'}`]

  for (const post of posts) {
    lines.push(
      `${post.txid}: ${post.text} (replies ${post.replyCount}, likes ${post.likeCount})`
    )
  }

  lines.push(
    `pagination: limit ${pagination.limit}, offset ${pagination.offset}, total ${pagination.total}, hasMore ${pagination.hasMore}`
  )

  return lines.join('\n')
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-07T01:53:52.397Z","module_hash":"5bc32cf79c440d2a423b37aff42f86b0cf05b60c6ecf3fe816c2639797d9e94c","functions":[{"id":"func/parseNonNegativeInteger","name":"parseNonNegativeInteger","line":19,"end_line":27,"hash":"59414499403988f535c8f64194324787a0f7d585597888e4c06f17f65ff8b5a6"},{"id":"func/parseFeedFlags","name":"parseFeedFlags","line":30,"end_line":36,"hash":"139a05f5921133012a6b862aa435cf6885f5acc00ec9aa2ecb764bddee3f3cd2"},{"id":"func/formatFeedMessage","name":"formatFeedMessage","line":40,"end_line":54,"hash":"a9a51f74202031c461c1a19e44658ef8b06f6547cf2e24ae4f36bbadb31600e5"}]}
// mutate4javascript-manifest-end
