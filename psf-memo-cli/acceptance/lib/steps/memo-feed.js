/*
  Gherkin step handlers for the Memo Feed feature.

  The scenario world serves a five-post recent-feed fixture through the same
  fake fetch used by the Memo DB client handlers, and each scenario runs the
  real memo-feed command in JSON mode so its reported posts and pagination can
  be asserted from the captured stdout.
*/

// Local libraries
import MemoFeed from '../../../src/commands/memo-feed.js'
import { runReadCommand } from '../read-command.js'
import { assertEqual, resolveParam } from '../step-support.js'

// The recent-feed fixture: five posts newest-first with the service fields the
// feed reports. Scenario 3 pins alpha's and charlie's text and counts.
const FEED_POSTS = [
  { txid: 'alpha', addr: 'bitcoincash:qalpha', text: 'first memo', seen: 5, blockHeight: 600005, replyCount: 2, likeCount: 3 },
  { txid: 'bravo', addr: 'bitcoincash:qbravo', text: 'second memo', seen: 4, blockHeight: 600004, replyCount: 1, likeCount: 0 },
  { txid: 'charlie', addr: 'bitcoincash:qcharlie', text: 'third memo', seen: 3, blockHeight: 600003, replyCount: 0, likeCount: 1 },
  { txid: 'delta', addr: 'bitcoincash:qdelta', text: 'fourth memo', seen: 2, blockHeight: 600002, replyCount: 0, likeCount: 0 },
  { txid: 'echo', addr: 'bitcoincash:qecho', text: 'fifth memo', seen: 1, blockHeight: 600001, replyCount: 0, likeCount: 0 }
]

const memoFeedHandlers = [
  {
    name: 'service serves the recent feed',
    pattern: /^the Memo DB service serves the recent feed$/,
    run (m, example, world) {
      world.posts = FEED_POSTS.map((post) => ({ ...post }))
    }
  },
  {
    name: 'recent feed is empty',
    pattern: /^the recent feed is empty$/,
    run (m, example, world) {
      world.posts = []
    }
  },
  {
    name: 'recent-feed request fails',
    pattern: /^the recent-feed request fails$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'memo-feed command runs',
    pattern: /^the memo-feed command runs$/,
    async run (m, example, world) {
      await runReadCommand(world, MemoFeed, 'feed', {})
    }
  },
  {
    name: 'memo-feed command runs with a page',
    pattern: /^the memo-feed command runs with limit (.+) and offset (.+)$/,
    async run (m, example, world) {
      await runReadCommand(world, MemoFeed, 'feed', {
        limit: resolveParam(m[1], example),
        offset: resolveParam(m[2], example)
      })
    }
  },
  {
    name: 'memo-feed command runs with a viewer',
    pattern: /^the memo-feed command runs with viewer "(.+)"$/,
    async run (m, example, world) {
      await runReadCommand(world, MemoFeed, 'feed', { viewer: resolveParam(m[1], example) })
    }
  },
  {
    name: 'service received a recent-feed request',
    pattern: /^the service received a recent-feed request with limit (.+) and offset (.+)$/,
    run (m, example, world) {
      const limit = resolveParam(m[1], example)
      const offset = resolveParam(m[2], example)
      const request = world.lastRequest
      assertEqual(request?.pathname, '/posts/recent', 'request path')
      assertEqual(request?.searchParams.get('limit'), limit, 'limit')
      assertEqual(request?.searchParams.get('offset'), offset, 'offset')
    }
  },
  {
    name: 'service received no viewer',
    pattern: /^the service received no viewer query parameter$/,
    run (m, example, world) {
      assertEqual(world.lastRequest?.searchParams.has('viewer'), false, 'viewer presence')
    }
  },
  {
    name: 'service received the quoted viewer',
    pattern: /^the service received the viewer query parameter "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.lastRequest?.searchParams.get('viewer'), resolveParam(m[1], example), 'viewer', { quote: true })
    }
  },
  {
    name: 'command reported the post txids',
    pattern: /^the command reported the post txids "(.+)"$/,
    run (m, example, world) {
      const actual = (world.feedJson?.posts || []).map((post) => post.txid).join(', ')
      assertEqual(actual, resolveParam(m[1], example), 'post txids', { quote: true })
    }
  },
  {
    name: 'command reported pagination',
    pattern: /^the command reported pagination total (.+) and hasMore (.+)$/,
    run (m, example, world) {
      const pagination = world.feedJson?.pagination || {}
      assertEqual(pagination.total, Number.parseInt(resolveParam(m[1], example), 10), 'pagination total')
      assertEqual(pagination.hasMore, resolveParam(m[2], example) === 'true', 'pagination hasMore')
    }
  },
  {
    name: 'command reported a post with its fields',
    pattern: /^the command reported the post "(.+)" with text "(.+)", reply count (.+), and like count (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const post = (world.feedJson?.posts || []).find((p) => p.txid === txid)
      if (!post) {
        throw new Error(`Expected a reported post with txid ${txid}`)
      }
      assertEqual(post.text, resolveParam(m[2], example), 'post text', { quote: true })
      assertEqual(post.replyCount, Number.parseInt(resolveParam(m[3], example), 10), 'reply count')
      assertEqual(post.likeCount, Number.parseInt(resolveParam(m[4], example), 10), 'like count')
    }
  },
  {
    name: 'command reported a post count',
    pattern: /^the command reported (.+) posts$/,
    run (m, example, world) {
      assertEqual((world.feedJson?.posts || []).length, Number.parseInt(resolveParam(m[1], example), 10), 'post count')
    }
  },
  {
    name: 'memo-feed command reported an error',
    pattern: /^the memo-feed command reported an error$/,
    run (m, example, world) {
      assertEqual(world.feedExitCode, 1, 'memo-feed exit code')

      let parsed
      try {
        parsed = JSON.parse(world.feedStderr)
      } catch (err) {
        throw new Error(`Expected a JSON error on stderr, got "${world.feedStderr}"`)
      }
      if (!parsed.error) {
        throw new Error(`Expected an error message on stderr, got "${world.feedStderr}"`)
      }
    }
  }
]

export { memoFeedHandlers }
