/*
  Gherkin step handlers for the Memo Posts feature.

  The five-post address fixture is served by the shared memo-profile step, and
  the address-posts fake-fetch branch returns it. Each scenario runs the real
  memo-posts command in JSON mode so its reported posts and pagination can be
  asserted from the captured stdout.
*/

// Local libraries
import MemoPosts from '../../../src/commands/memo-posts.js'
import { runReadCommand, assertUsageError, assertReadCommandError } from '../read-command.js'
import { findReportedPost } from './read-result.js'
import { assertEqual, resolveParam } from '../step-support.js'

async function runPosts (world, flags) {
  await runReadCommand(world, MemoPosts, 'posts', flags)
}

const memoPostsHandlers = [
  {
    name: 'memo-posts command runs without an address',
    pattern: /^the memo-posts command runs without an address$/,
    async run (m, example, world) {
      await runPosts(world, {})
    }
  },
  {
    name: 'memo-posts command runs for an address',
    pattern: /^the memo-posts command runs for "([^"]+)"$/,
    async run (m, example, world) {
      await runPosts(world, { addr: resolveParam(m[1], example) })
    }
  },
  {
    name: 'memo-posts command runs with a page',
    pattern: /^the memo-posts command runs for "([^"]+)" with limit (.+) and offset (.+)$/,
    async run (m, example, world) {
      await runPosts(world, {
        addr: resolveParam(m[1], example),
        limit: resolveParam(m[2], example),
        offset: resolveParam(m[3], example)
      })
    }
  },
  {
    name: 'command reported a post with its text and reply count',
    pattern: /^the command reported the post "([^"]+)" with text "([^"]*)" and reply count (.+)$/,
    run (m, example, world) {
      const post = findReportedPost(world, resolveParam(m[1], example))
      assertEqual(post.text, resolveParam(m[2], example), 'post text', { quote: true })
      assertEqual(post.replyCount, Number.parseInt(resolveParam(m[3], example), 10), 'reply count')
    }
  },
  {
    name: 'service has no posts for an address',
    pattern: /^the Memo DB service has no posts for "([^"]+)"$/,
    run (m, example, world) {
      world.profilePosts = []
    }
  },
  {
    name: 'address-posts request fails',
    pattern: /^the Memo DB service fails the address-posts request$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'memo-posts command reported the usage error',
    pattern: /^the memo-posts command reported the usage error "(.+)"$/,
    run (m, example, world) {
      assertUsageError(world, 'posts', 'memo-posts', resolveParam(m[1], example))
    }
  },
  {
    name: 'memo-posts command reported an error',
    pattern: /^the memo-posts command reported an error$/,
    run (m, example, world) {
      assertReadCommandError(world, 'posts', 'memo-posts')
    }
  }
]

export { memoPostsHandlers }
