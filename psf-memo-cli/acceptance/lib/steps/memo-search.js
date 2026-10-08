/*
  Gherkin step handlers for the Memo Search feature.

  The scenario world serves matching posts and profiles through the same fake
  fetch used by the Memo DB client handlers, and each scenario runs the real
  memo-search command in JSON mode so its reported posts, profiles, and
  pagination can be asserted from the captured stdout. The viewer, pagination,
  post-txid, post-count, and usage/error assertions are shared with the other
  read features.
*/

// Local libraries
import MemoSearch from '../../../src/commands/memo-search.js'
import { runReadCommand, assertUsageError, assertReadCommandError } from '../read-command.js'
import { assertReportedField, findReportedPost } from './read-result.js'
import { assertEqual, resolveParam } from '../step-support.js'

// The default fixture: two posts and one profile, total 3.
const SEARCH_POSTS = [
  { txid: 'alpha', addr: 'addrA', text: 'first memo', seen: 5, blockHeight: 600005 },
  { txid: 'bravo', addr: 'addrA', text: 'second memo', seen: 4, blockHeight: 600004 }
]

const SEARCH_PROFILES = [
  { addr: 'bitcoincash:qcarol', name: 'Carol Search', text: 'searches often', seen: 3, blockHeight: 600003 }
]

// The five-post fixture used by the pagination outline.
const FIVE_SEARCH_POSTS = [
  { txid: 'alpha', addr: 'addrA', text: 'first memo', seen: 5, blockHeight: 600005 },
  { txid: 'bravo', addr: 'addrA', text: 'second memo', seen: 4, blockHeight: 600004 },
  { txid: 'charlie', addr: 'addrA', text: 'third memo', seen: 3, blockHeight: 600003 },
  { txid: 'delta', addr: 'addrA', text: 'fourth memo', seen: 2, blockHeight: 600002 },
  { txid: 'echo', addr: 'addrA', text: 'fifth memo', seen: 1, blockHeight: 600001 }
]

async function runSearch (world, flags) {
  await runReadCommand(world, MemoSearch, 'search', flags)
}

const memoSearchHandlers = [
  {
    name: 'service serves search results',
    pattern: /^the Memo DB service serves search results$/,
    run (m, example, world) {
      world.searchPosts = SEARCH_POSTS.map((post) => ({ ...post }))
      world.searchProfiles = SEARCH_PROFILES.map((profile) => ({ ...profile }))
    }
  },
  {
    name: 'service serves a five-post search result',
    pattern: /^the Memo DB service serves a five-post search result$/,
    run (m, example, world) {
      world.searchPosts = FIVE_SEARCH_POSTS.map((post) => ({ ...post }))
      world.searchProfiles = []
    }
  },
  {
    name: 'search request fails',
    pattern: /^the search request fails$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'memo-search command runs without a query',
    pattern: /^the memo-search command runs without a query$/,
    async run (m, example, world) {
      await runSearch(world, {})
    }
  },
  {
    name: 'memo-search command runs for a query',
    pattern: /^the memo-search command runs for "([^"]+)"$/,
    async run (m, example, world) {
      await runSearch(world, { query: resolveParam(m[1], example) })
    }
  },
  {
    name: 'memo-search command runs with a page',
    pattern: /^the memo-search command runs for "([^"]+)" with limit (.+) and offset (.+)$/,
    async run (m, example, world) {
      await runSearch(world, {
        query: resolveParam(m[1], example),
        limit: resolveParam(m[2], example),
        offset: resolveParam(m[3], example)
      })
    }
  },
  {
    name: 'memo-search command runs with a viewer',
    pattern: /^the memo-search command runs for "([^"]+)" with viewer "([^"]+)"$/,
    async run (m, example, world) {
      await runSearch(world, {
        query: resolveParam(m[1], example),
        viewer: resolveParam(m[2], example)
      })
    }
  },
  {
    name: 'memo-search command runs with a blank query',
    pattern: /^the memo-search command runs with a blank query$/,
    async run (m, example, world) {
      await runSearch(world, { query: '   ' })
    }
  },
  {
    name: 'service received a search request',
    pattern: /^the service received a search request for "([^"]+)" with limit (.+) and offset (.+)$/,
    run (m, example, world) {
      assertEqual(world.lastRequest?.pathname, '/search', 'request path')
      assertEqual(world.lastRequest?.searchParams.get('q'), resolveParam(m[1], example), 'query', { quote: true })
      assertEqual(world.lastRequest?.searchParams.get('limit'), resolveParam(m[2], example), 'limit')
      assertEqual(world.lastRequest?.searchParams.get('offset'), resolveParam(m[3], example), 'offset')
    }
  },
  {
    name: 'command reported the profile addresses',
    pattern: /^the command reported the profile addresses "(.+)"$/,
    run (m, example, world) {
      assertReportedField(world.readJson?.profiles, 'addr', resolveParam(m[1], example), 'profile addresses')
    }
  },
  {
    name: 'command reported a profile with its name',
    pattern: /^the command reported the profile "([^"]+)" with name "([^"]+)"$/,
    run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const profile = (world.readJson?.profiles || []).find((p) => p.addr === addr)
      if (!profile) {
        throw new Error(`Expected a reported profile with address ${addr}`)
      }
      assertEqual(profile.name, resolveParam(m[2], example), 'profile name', { quote: true })
    }
  },
  {
    name: 'command reported no profiles',
    pattern: /^the command reported 0 profiles$/,
    run (m, example, world) {
      assertEqual((world.readJson?.profiles || []).length, 0, 'profile count')
    }
  },
  {
    name: 'command reported a post with its text',
    pattern: /^the command reported the post "([^"]+)" with text "([^"]+)"$/,
    run (m, example, world) {
      const post = findReportedPost(world, resolveParam(m[1], example))
      assertEqual(post.text, resolveParam(m[2], example), 'post text', { quote: true })
    }
  },
  {
    name: 'memo-search command reported the usage error',
    pattern: /^the memo-search command reported the usage error "(.+)"$/,
    run (m, example, world) {
      assertUsageError(world, 'search', 'memo-search', resolveParam(m[1], example))
    }
  },
  {
    name: 'memo-search command reported an error',
    pattern: /^the memo-search command reported an error$/,
    run (m, example, world) {
      assertReadCommandError(world, 'search', 'memo-search')
    }
  }
]

export { memoSearchHandlers }
