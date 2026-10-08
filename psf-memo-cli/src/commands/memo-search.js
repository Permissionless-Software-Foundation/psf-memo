/*
  memo-search: read one page of matching posts and profiles.

  A read-only command for the psf-memo-db /search route. The query comes from the
  required -q flag; an optional --viewer address scopes the posts to the viewer's
  mute filter (profiles are not mute-filtered). It reports the matching posts and
  profiles with the service pagination unchanged. A missing -q is a usage error
  (exit 2); a provided but blank query reports an empty page (exit 0); a failed
  request is an error (exit 1). No wallet and no broadcast.
*/

// Local libraries
import { initReadCommand, createMemoDbClient, runReadCommand } from '../lib/read-command.js'
import {
  parseSearchFlags,
  isEmptySearchQuery,
  emptySearchResult,
  formatSearchMessage
} from '../lib/memo-search.js'

class MemoSearch {
  constructor (options = {}) {
    initReadCommand(this, options, 'readSearch')
  }

  // Read the search page and report it. Returns the exit code (0/1/2) and
  // assigns it to process.exitCode for commander.
  async run (flags = {}) {
    return runReadCommand({
      command: this,
      flags,
      outcome: async () => {
        const fields = this.validateFlags(flags)
        const { posts = [], profiles = [], pagination = {} } = await this.readSearch({
          ...fields,
          dbUrl: flags.dbUrl
        })

        return {
          message: formatSearchMessage(posts, profiles, pagination),
          data: { posts, profiles, pagination }
        }
      }
    })
  }

  // Validate and resolve the required query, optional viewer, and page flags
  // before any request. Throws a UsageError (exit 2) when they are invalid.
  validateFlags (flags) {
    return parseSearchFlags(flags)
  }

  // Build the read-only Memo DB client, honoring a --db-url override.
  createClient (dbUrl) {
    return createMemoDbClient(this, dbUrl)
  }

  // Fetch one page of search results. A blank query has nothing to match, so it
  // reports an empty page without a request.
  readSearch ({ query, viewer, limit, offset, dbUrl }) {
    if (isEmptySearchQuery(query)) {
      return emptySearchResult(limit, offset)
    }

    return this.createClient(dbUrl).search(query, { limit, offset, viewer })
  }
}

export default MemoSearch
