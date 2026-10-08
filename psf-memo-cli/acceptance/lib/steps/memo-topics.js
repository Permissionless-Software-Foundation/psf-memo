/*
  Gherkin step handlers for the Memo Topics feature.

  The scenario world serves a five-topic fixture through the same fake fetch
  used by the Memo DB client handlers, and each scenario runs the real
  memo-topics command in JSON mode so its reported topics and pagination can be
  asserted from the captured stdout.
*/

// Local libraries
import MemoTopics from '../../../src/commands/memo-topics.js'
import { runReadCommand, assertReadCommandError } from '../read-command.js'
import { assertReportedField, assertPageRequest } from './read-result.js'
import { assertEqual, resolveParam } from '../step-support.js'

// Five topics newest-first with the service metadata.
const TOPICS = [
  { room: 'memo', postCount: 5, lastHeight: 600005, lastSeen: 1700020000000, followerCount: 12 },
  { room: 'cash', postCount: 2, lastHeight: 600004, lastSeen: 1700010000000, followerCount: 4 },
  { room: 'dance', postCount: 4, lastHeight: 600003, lastSeen: 1700005000000, followerCount: 3 },
  { room: 'anime', postCount: 1, lastHeight: 600002, lastSeen: 1700004000000, followerCount: 1 },
  { room: 'lone', postCount: 0, lastHeight: 0, lastSeen: 0, followerCount: 7 }
]

const memoTopicsHandlers = [
  {
    name: 'service serves the topics list',
    pattern: /^the Memo DB service serves the topics list$/,
    run (m, example, world) {
      world.topics = TOPICS.map((topic) => ({ ...topic }))
    }
  },
  {
    name: 'topics list is empty',
    pattern: /^the topics list is empty$/,
    run (m, example, world) {
      world.topics = []
    }
  },
  {
    name: 'topics request fails',
    pattern: /^the topics request fails$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'memo-topics command runs',
    pattern: /^the memo-topics command runs$/,
    async run (m, example, world) {
      await runReadCommand(world, MemoTopics, 'topics', {})
    }
  },
  {
    name: 'memo-topics command runs with a page',
    pattern: /^the memo-topics command runs with limit (.+) and offset (.+)$/,
    async run (m, example, world) {
      await runReadCommand(world, MemoTopics, 'topics', {
        limit: resolveParam(m[1], example),
        offset: resolveParam(m[2], example)
      })
    }
  },
  {
    name: 'service received a topics request',
    pattern: /^the service received a topics request with limit (.+) and offset (.+)$/,
    run (m, example, world) {
      assertPageRequest(world, '/topics', resolveParam(m[1], example), resolveParam(m[2], example))
    }
  },
  {
    name: 'command reported the topic rooms',
    pattern: /^the command reported the topic rooms "(.+)"$/,
    run (m, example, world) {
      assertReportedField(world.readJson?.topics, 'room', resolveParam(m[1], example), 'topic rooms')
    }
  },
  {
    name: 'command reported a topic with metadata',
    pattern: /^the command reported the topic "([^"]+)" with lastSeen (.+), post count (.+), and follower count (.+)$/,
    run (m, example, world) {
      const room = resolveParam(m[1], example)
      const topic = (world.readJson?.topics || []).find((t) => t.room === room)
      if (!topic) {
        throw new Error(`Expected a reported topic with room ${room}`)
      }
      assertEqual(topic.lastSeen, Number.parseInt(resolveParam(m[2], example), 10), 'lastSeen')
      assertEqual(topic.postCount, Number.parseInt(resolveParam(m[3], example), 10), 'post count')
      assertEqual(topic.followerCount, Number.parseInt(resolveParam(m[4], example), 10), 'follower count')
    }
  },
  {
    name: 'command reported no topics',
    pattern: /^the command reported 0 topics$/,
    run (m, example, world) {
      assertEqual((world.readJson?.topics || []).length, 0, 'topic count')
    }
  },
  {
    name: 'memo-topics command reported an error',
    pattern: /^the memo-topics command reported an error$/,
    run (m, example, world) {
      assertReadCommandError(world, 'topics', 'memo-topics')
    }
  }
]

export { memoTopicsHandlers }
