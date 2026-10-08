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
import { ListReadCommand } from '../lib/list-command.js'
import {
  parseSearchFlags,
  isEmptySearchQuery,
  emptySearchResult,
  formatSearchMessage
} from '../lib/memo-search.js'

class MemoSearch extends ListReadCommand {
  constructor (options = {}) {
    super(options, 'readSearch')
  }

  // Validate and resolve the required query, optional viewer, and page flags
  // before any request. Throws a UsageError (exit 2) when they are invalid.
  parseFlags (flags) {
    return parseSearchFlags(flags)
  }

  // Render the reported posts, profiles, and service pagination.
  format ({ posts = [], profiles = [], pagination = {} }) {
    return {
      message: formatSearchMessage(posts, profiles, pagination),
      data: { posts, profiles, pagination }
    }
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
// {"version":1,"tested_at":"2026-10-08T14:46:41.482Z","module_hash":"f2fe9aa497e0ad6cf8ed0f2d92e00fe2b2cda79c801e939928308042049da858","functions":[{"id":"func/MemoSearch.constructor","name":"MemoSearch.constructor","line":22,"end_line":24,"hash":"f3d2c937f48e4564f7accea7978cbb217217f0b4cc147451218085cd4c3ad63c"},{"id":"func/MemoSearch.parseFlags","name":"MemoSearch.parseFlags","line":28,"end_line":30,"hash":"d847b3455db8823a5ca40460db58a8059083bd3c38587d90ae210d62ca469470"},{"id":"func/MemoSearch.format","name":"MemoSearch.format","line":33,"end_line":38,"hash":"64dc93a1e98eb539f652799de8459504b0d97419e8b0ae40f7a53d58c2eb59a2"},{"id":"func/MemoSearch.readSearch","name":"MemoSearch.readSearch","line":42,"end_line":48,"hash":"6ecce2691bc68d7216405323ea5cf5d552f44fdd27e82f85f24c984ec3266529"}]}
// mutate4javascript-manifest-end
