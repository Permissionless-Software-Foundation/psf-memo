/*
  Gherkin step handlers for the Memo Feed feature.

  The scenario world serves a five-post recent-feed fixture through the same
  fake fetch used by the Memo DB client handlers, and each scenario runs the
  real memo-feed command in JSON mode so its reported posts and pagination can
  be asserted from the captured stdout.
*/

// Local libraries
import MemoFeed from '../../../src/commands/memo-feed.js'
import { captureStream } from '../../../test/support/capture.js'
import { resolveParam } from '../step-support.js'

// The recent-feed fixture: five posts newest-first with the service fields the
// feed reports. Scenario 3 pins alpha's and charlie's text and counts.
const FEED_POSTS = [
  { txid: 'alpha', addr: 'bitcoincash:qalpha', text: 'first memo', seen: 5, blockHeight: 600005, replyCount: 2, likeCount: 3 },
  { txid: 'bravo', addr: 'bitcoincash:qbravo', text: 'second memo', seen: 4, blockHeight: 600004, replyCount: 1, likeCount: 0 },
  { txid: 'charlie', addr: 'bitcoincash:qcharlie', text: 'third memo', seen: 3, blockHeight: 600003, replyCount: 0, likeCount: 1 },
  { txid: 'delta', addr: 'bitcoincash:qdelta', text: 'fourth memo', seen: 2, blockHeight: 600002, replyCount: 0, likeCount: 0 },
  { txid: 'echo', addr: 'bitcoincash:qecho', text: 'fifth memo', seen: 1, blockHeight: 600001, replyCount: 0, likeCount: 0 }
]

// Run the real memo-feed command in JSON mode against the scenario's fake
// service, recording its exit code, streams, and parsed JSON. The command
// writes process.exitCode for the CLI; reset it so the generated acceptance
// process (which reports failures itself) is not left with a failing code.
async function runMemoFeed (world, flags) {
  const stdout = captureStream()
  const stderr = captureStream()
  const command = new MemoFeed({
    fetchImpl: world.fetch,
    envUrl: null,
    stdout: stdout.stream,
    stderr: stderr.stream
  })

  world.feedExitCode = await command.run({ json: true, ...flags })
  process.exitCode = 0

  world.feedStdout = stdout.text()
  world.feedStderr = stderr.text()
  world.feedJson = null
  try {
    world.feedJson = JSON.parse(world.feedStdout)
  } catch (err) {
    world.feedJson = null
  }
}

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
      await runMemoFeed(world, {})
    }
  },
  {
    name: 'memo-feed command runs with a page',
    pattern: /^the memo-feed command runs with limit (.+) and offset (.+)$/,
    async run (m, example, world) {
      await runMemoFeed(world, {
        limit: resolveParam(m[1], example),
        offset: resolveParam(m[2], example)
      })
    }
  },
  {
    name: 'memo-feed command runs with a viewer',
    pattern: /^the memo-feed command runs with viewer "(.+)"$/,
    async run (m, example, world) {
      await runMemoFeed(world, { viewer: resolveParam(m[1], example) })
    }
  },
  {
    name: 'service received a recent-feed request',
    pattern: /^the service received a recent-feed request with limit (.+) and offset (.+)$/,
    run (m, example, world) {
      const limit = resolveParam(m[1], example)
      const offset = resolveParam(m[2], example)
      const request = world.lastRequest
      if (request?.pathname !== '/posts/recent') {
        throw new Error(`Expected a /posts/recent request, got ${request?.pathname}`)
      }
      if (request.searchParams.get('limit') !== limit) {
        throw new Error(`Expected limit ${limit}, got ${request.searchParams.get('limit')}`)
      }
      if (request.searchParams.get('offset') !== offset) {
        throw new Error(`Expected offset ${offset}, got ${request.searchParams.get('offset')}`)
      }
    }
  },
  {
    name: 'service received no viewer',
    pattern: /^the service received no viewer query parameter$/,
    run (m, example, world) {
      if (world.lastRequest?.searchParams.has('viewer')) {
        throw new Error(`Expected no viewer, got ${world.lastRequest.searchParams.get('viewer')}`)
      }
    }
  },
  {
    name: 'service received the quoted viewer',
    pattern: /^the service received the viewer query parameter "(.+)"$/,
    run (m, example, world) {
      const viewer = resolveParam(m[1], example)
      if (world.lastRequest?.searchParams.get('viewer') !== viewer) {
        throw new Error(`Expected viewer ${viewer}, got ${world.lastRequest?.searchParams.get('viewer')}`)
      }
    }
  },
  {
    name: 'command reported the post txids',
    pattern: /^the command reported the post txids "(.+)"$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      const actual = (world.feedJson?.posts || []).map((post) => post.txid).join(', ')
      if (actual !== expected) {
        throw new Error(`Expected post txids "${expected}", got "${actual}"`)
      }
    }
  },
  {
    name: 'command reported pagination',
    pattern: /^the command reported pagination total (.+) and hasMore (.+)$/,
    run (m, example, world) {
      const total = Number.parseInt(resolveParam(m[1], example), 10)
      const hasMore = resolveParam(m[2], example) === 'true'
      const pagination = world.feedJson?.pagination || {}
      if (pagination.total !== total) {
        throw new Error(`Expected pagination total ${total}, got ${pagination.total}`)
      }
      if (pagination.hasMore !== hasMore) {
        throw new Error(`Expected pagination hasMore ${hasMore}, got ${pagination.hasMore}`)
      }
    }
  },
  {
    name: 'command reported a post with its fields',
    pattern: /^the command reported the post "(.+)" with text "(.+)", reply count (.+), and like count (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const text = resolveParam(m[2], example)
      const replyCount = Number.parseInt(resolveParam(m[3], example), 10)
      const likeCount = Number.parseInt(resolveParam(m[4], example), 10)
      const post = (world.feedJson?.posts || []).find((p) => p.txid === txid)
      if (!post) {
        throw new Error(`Expected a reported post with txid ${txid}`)
      }
      if (post.text !== text) {
        throw new Error(`Expected post text "${text}", got "${post.text}"`)
      }
      if (post.replyCount !== replyCount) {
        throw new Error(`Expected reply count ${replyCount}, got ${post.replyCount}`)
      }
      if (post.likeCount !== likeCount) {
        throw new Error(`Expected like count ${likeCount}, got ${post.likeCount}`)
      }
    }
  },
  {
    name: 'command reported a post count',
    pattern: /^the command reported (.+) posts$/,
    run (m, example, world) {
      const expected = Number.parseInt(resolveParam(m[1], example), 10)
      const actual = (world.feedJson?.posts || []).length
      if (actual !== expected) {
        throw new Error(`Expected ${expected} reported posts, got ${actual}`)
      }
    }
  },
  {
    name: 'memo-feed command reported an error',
    pattern: /^the memo-feed command reported an error$/,
    run (m, example, world) {
      if (world.feedExitCode !== 1) {
        throw new Error(`Expected the memo-feed command to exit 1, got ${world.feedExitCode}`)
      }

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
