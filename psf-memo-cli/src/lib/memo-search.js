/*
  Pure helpers for the memo-search read command.

  The command reads one page of GET /search from psf-memo-db: a
  case-insensitive substring match over top-level post text and profile
  name/bio. This module owns the required -q query, the page defaults, and the
  human-readable summary of the matching posts and profiles, so the command is a
  thin wiring layer over the shared reporter and the read-only Memo DB client.
*/

// Local libraries
import { UsageError } from './reporter.js'
import { parseNonNegativeInteger } from './page-flags.js'
import { formatReadCount, formatPagination } from './page-summary.js'

// The default page matches the web client and the DB route's own default.
export const DEFAULT_SEARCH_LIMIT = 50
export const DEFAULT_SEARCH_OFFSET = 0

// Resolve the required search query, the optional viewer, and the page from
// command-line flags. Throws a UsageError (exit 2) for a missing query or a bad
// --limit/--offset. An empty or whitespace-only query is accepted here so the
// command can return an empty page rather than treating it as usage.
export function parseSearchFlags (flags = {}) {
  if (flags.query === undefined || flags.query === null) {
    throw new UsageError('You must specify a search query with the -q flag.')
  }

  return {
    query: flags.query,
    viewer: flags.viewer || null,
    limit: parseNonNegativeInteger(flags.limit, DEFAULT_SEARCH_LIMIT, '--limit'),
    offset: parseNonNegativeInteger(flags.offset, DEFAULT_SEARCH_OFFSET, '--offset')
  }
}

// A provided query that is empty or only whitespace has nothing to match.
export function isEmptySearchQuery (query) {
  return String(query ?? '').trim() === ''
}

// The empty page a blank query reports, carrying the requested pagination.
export function emptySearchResult (limit = DEFAULT_SEARCH_LIMIT, offset = DEFAULT_SEARCH_OFFSET) {
  return {
    posts: [],
    profiles: [],
    pagination: { limit, offset, total: 0, hasMore: false }
  }
}

// Render the human-readable search summary: the post count and lines, the
// profile count and lines, then the service pagination unchanged.
export function formatSearchMessage (posts = [], profiles = [], pagination = {}) {
  const lines = [
    formatReadCount(posts.length, 'post'),
    ...posts.map((post) => `${post.txid}: ${post.text}`),
    formatReadCount(profiles.length, 'profile'),
    ...profiles.map((profile) => `${profile.addr}: ${profile.name}`),
    formatPagination(pagination)
  ]

  return lines.join('\n')
}
