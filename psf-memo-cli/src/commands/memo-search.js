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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T00:26:51.333Z","module_hash":"d9637dbd6d50a4221b1f3b2230c60aaa2779ad49e47e5d711bcdd8e12ce51ad7","functions":[{"id":"func/MemoSearch.constructor","name":"MemoSearch.constructor","line":22,"end_line":24,"hash":"6cd229735c2bbe41180132ba145e5a6dfeb88cbac87ec552264e07f6fce83f19"},{"id":"func/MemoSearch.run","name":"MemoSearch.run","line":28,"end_line":45,"hash":"4eb217346580e60b9e26463244ae67e21b325282e75729313c04c3ac22073c57"},{"id":"func/MemoSearch.validateFlags","name":"MemoSearch.validateFlags","line":49,"end_line":51,"hash":"155111cd8a7cfd3a797256c404f701c909616da63a619bb945491ab77b7e427c"},{"id":"func/MemoSearch.createClient","name":"MemoSearch.createClient","line":54,"end_line":56,"hash":"54385637d7ccdbdb4482a273dbbf40bd7272b92032c0a6f5d6ac2de757b02e80"},{"id":"func/MemoSearch.readSearch","name":"MemoSearch.readSearch","line":60,"end_line":66,"hash":"6ecce2691bc68d7216405323ea5cf5d552f44fdd27e82f85f24c984ec3266529"}]}
// mutate4javascript-manifest-end
