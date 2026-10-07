/*
  Gherkin step handlers for the Memo Topic feature.

  The scenario world serves a five-post topic fixture through the same fake fetch
  used by the Memo DB client handlers, and each scenario runs the real memo-topic
  command in JSON mode so its reported posts and pagination can be asserted from
  the captured stdout. The viewer query-parameter and post-field steps are shared
  with the memo-feed feature.
*/

// Local libraries
import MemoTopic from '../../../src/commands/memo-topic.js'
import { runReadCommand, assertUsageError, assertReadCommandError } from '../read-command.js'
import { assertEqual, resolveParam } from '../step-support.js'

// Five topic posts newest-first with the service fields.
const TOPIC_POSTS = [
  { txid: 'alpha', addr: 'addrA', text: 'first memo', seen: 5, blockHeight: 600005, replyCount: 2, likeCount: 3 },
  { txid: 'bravo', addr: 'addrA', text: 'second memo', seen: 4, blockHeight: 600004, replyCount: 1, likeCount: 0 },
  { txid: 'charlie', addr: 'addrA', text: 'third memo', seen: 3, blockHeight: 600003, replyCount: 0, likeCount: 1 },
  { txid: 'delta', addr: 'addrA', text: 'fourth memo', seen: 2, blockHeight: 600002, replyCount: 0, likeCount: 0 },
  { txid: 'echo', addr: 'addrA', text: 'fifth memo', seen: 1, blockHeight: 600001, replyCount: 0, likeCount: 0 }
]

async function runTopic (world, flags) {
  await runReadCommand(world, MemoTopic, 'topic', flags)
}

const memoTopicHandlers = [
  {
    name: 'service serves topic posts',
    pattern: /^the Memo DB service serves topic posts for "([^"]+)"$/,
    run (m, example, world) {
      world.topicPostsByRoom[resolveParam(m[1], example)] = TOPIC_POSTS.map((post) => ({ ...post }))
    }
  },
  {
    name: 'topic-posts request fails',
    pattern: /^the topic-posts request fails$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'memo-topic command runs without a room',
    pattern: /^the memo-topic command runs without a room$/,
    async run (m, example, world) {
      await runTopic(world, {})
    }
  },
  {
    name: 'memo-topic command runs for a room',
    pattern: /^the memo-topic command runs for "([^"]+)"$/,
    async run (m, example, world) {
      await runTopic(world, { room: resolveParam(m[1], example) })
    }
  },
  {
    name: 'memo-topic command runs with a page',
    pattern: /^the memo-topic command runs for "([^"]+)" with limit (.+) and offset (.+)$/,
    async run (m, example, world) {
      await runTopic(world, {
        room: resolveParam(m[1], example),
        limit: resolveParam(m[2], example),
        offset: resolveParam(m[3], example)
      })
    }
  },
  {
    name: 'memo-topic command runs with a viewer',
    pattern: /^the memo-topic command runs for "([^"]+)" with viewer "([^"]+)"$/,
    async run (m, example, world) {
      await runTopic(world, {
        room: resolveParam(m[1], example),
        viewer: resolveParam(m[2], example)
      })
    }
  },
  {
    name: 'service received a topic-posts request',
    pattern: /^the service received a topic-posts request for "([^"]+)" with limit (.+) and offset (.+)$/,
    run (m, example, world) {
      const room = resolveParam(m[1], example)
      assertEqual(world.lastRequest?.pathname, `/topics/${room}/posts`, 'request path')
      assertEqual(world.lastRequest?.searchParams.get('limit'), resolveParam(m[2], example), 'limit')
      assertEqual(world.lastRequest?.searchParams.get('offset'), resolveParam(m[3], example), 'offset')
    }
  },
  {
    name: 'memo-topic command reported the usage error',
    pattern: /^the memo-topic command reported the usage error "(.+)"$/,
    run (m, example, world) {
      assertUsageError(world, 'topic', 'memo-topic', resolveParam(m[1], example))
    }
  },
  {
    name: 'memo-topic command reported an error',
    pattern: /^the memo-topic command reported an error$/,
    run (m, example, world) {
      assertReadCommandError(world, 'topic', 'memo-topic')
    }
  }
]

export { memoTopicHandlers }
