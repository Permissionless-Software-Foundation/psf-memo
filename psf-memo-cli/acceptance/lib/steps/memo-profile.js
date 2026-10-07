/*
  Gherkin step handlers for the Memo Profile feature.

  The scenario world serves the identity resources (name, profile text, avatar),
  a five-post page for the address, and the follow state through the same fake
  fetch used by the Memo DB client handlers. Each scenario runs the real
  memo-profile command in JSON mode so the composed profile can be asserted from
  the captured stdout.
*/

// Local libraries
import MemoProfile from '../../../src/commands/memo-profile.js'
import { runReadCommand, assertUsageError, assertReadCommandError } from '../read-command.js'
import { assertEqual, resolveParam } from '../step-support.js'

// Five top-level posts newest-first for the profile page.
const PROFILE_POSTS = [
  { txid: 'alpha', addr: 'addrA', text: 'first memo', seen: 5, blockHeight: 600005, replyCount: 2, likeCount: 3 },
  { txid: 'bravo', addr: 'addrA', text: 'second memo', seen: 4, blockHeight: 600004, replyCount: 1, likeCount: 0 },
  { txid: 'charlie', addr: 'addrA', text: 'third memo', seen: 3, blockHeight: 600003, replyCount: 0, likeCount: 1 },
  { txid: 'delta', addr: 'addrA', text: 'fourth memo', seen: 2, blockHeight: 600002, replyCount: 0, likeCount: 0 },
  { txid: 'echo', addr: 'addrA', text: 'fifth memo', seen: 1, blockHeight: 600001, replyCount: 0, likeCount: 0 }
]

async function runProfile (world, flags) {
  await runReadCommand(world, MemoProfile, 'profile', flags)
}

const memoProfileHandlers = [
  {
    name: 'memo-profile command runs without an address',
    pattern: /^the memo-profile command runs without an address$/,
    async run (m, example, world) {
      await runProfile(world, {})
    }
  },
  {
    name: 'service serves posts by an address',
    pattern: /^the Memo DB service serves posts by "(.+)"$/,
    run (m, example, world) {
      world.profilePosts = PROFILE_POSTS.map((post) => ({ ...post }))
    }
  },
  {
    name: 'service reports the follow state',
    pattern: /^the Memo DB service reports the follow state (.+)$/,
    run (m, example, world) {
      world.followState = resolveParam(m[1], example) === 'true'
    }
  },
  {
    name: 'profile request fails',
    pattern: /^the profile request fails$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'memo-profile command runs for an address',
    pattern: /^the memo-profile command runs for "([^"]+)"$/,
    async run (m, example, world) {
      await runProfile(world, { addr: resolveParam(m[1], example) })
    }
  },
  {
    name: 'memo-profile command runs with a page',
    pattern: /^the memo-profile command runs for "([^"]+)" with limit (.+) and offset (.+)$/,
    async run (m, example, world) {
      await runProfile(world, {
        addr: resolveParam(m[1], example),
        limit: resolveParam(m[2], example),
        offset: resolveParam(m[3], example)
      })
    }
  },
  {
    name: 'memo-profile command runs with a viewer',
    pattern: /^the memo-profile command runs for "([^"]+)" with viewer "([^"]+)"$/,
    async run (m, example, world) {
      await runProfile(world, {
        addr: resolveParam(m[1], example),
        viewer: resolveParam(m[2], example)
      })
    }
  },
  {
    name: 'command reported empty identity fields',
    pattern: /^the command reported empty identity fields$/,
    run (m, example, world) {
      assertEqual(world.profileJson?.name, '', 'name')
      assertEqual(world.profileJson?.bio, '', 'bio')
      assertEqual(world.profileJson?.avatar, '', 'avatar')
    }
  },
  {
    name: 'command reported the follow state',
    pattern: /^the command reported that the profile is (.+)$/,
    run (m, example, world) {
      assertEqual(world.profileJson?.following, resolveParam(m[1], example) === 'followed', 'following')
    }
  },
  {
    name: 'memo-profile command reported the usage error',
    pattern: /^the memo-profile command reported the usage error "(.+)"$/,
    run (m, example, world) {
      assertUsageError(world, 'profile', 'memo-profile', resolveParam(m[1], example))
    }
  },
  {
    name: 'memo-profile command reported an error',
    pattern: /^the memo-profile command reported an error$/,
    run (m, example, world) {
      assertReadCommandError(world, 'profile', 'memo-profile')
    }
  }
]

export { memoProfileHandlers }
