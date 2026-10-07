/*
  Pure helpers for the memo-posts read command.

  The command reads one page of the top-level posts authored by an address from
  psf-memo-db. This module owns the required address flag and the page defaults;
  the command is a thin wiring layer over the shared reporter, the post-page
  summary, and the read-only Memo DB client.
*/

// Local libraries
import { parseAddressFlag } from './address-flag.js'
import { parseNonNegativeInteger } from './page-flags.js'

// The default page matches the web client and the DB route's own default.
export const DEFAULT_POSTS_LIMIT = 50
export const DEFAULT_POSTS_OFFSET = 0

// Resolve the required author address and the page from command-line flags.
// Throws a UsageError (exit 2) for a missing address or a bad --limit/--offset.
export function parsePostsFlags (flags = {}) {
  return {
    address: parseAddressFlag(flags, 'You must specify an author address with the -a flag.'),
    limit: parseNonNegativeInteger(flags.limit, DEFAULT_POSTS_LIMIT, '--limit'),
    offset: parseNonNegativeInteger(flags.offset, DEFAULT_POSTS_OFFSET, '--offset')
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
