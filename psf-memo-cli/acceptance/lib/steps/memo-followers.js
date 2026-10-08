/*
  Gherkin step handlers for the Memo Followers feature.

  The scenario world serves the followers list through the same fake fetch used
  by the Memo DB client handlers. Each scenario runs the real memo-followers
  command in JSON mode so the requested followee address, the reported follower
  addresses, and the usage/error outcomes can be asserted from the captured
  stdout.
*/

// Local libraries
import MemoFollowers from '../../../src/commands/memo-followers.js'
import { runReadCommand, assertUsageError, assertReadCommandError } from '../read-command.js'
import { assertReportedAddresses } from './read-result.js'
import { assertEqual, resolveParam } from '../step-support.js'

// The default followers list served by the fake service.
const FOLLOWER_ADDRESSES = ['addrD', 'addrE']

async function runFollowers (world, flags) {
  await runReadCommand(world, MemoFollowers, 'followers', flags)
}

const memoFollowersHandlers = [
  {
    name: 'service serves the followers list',
    pattern: /^the Memo DB service serves the followers list$/,
    run (m, example, world) {
      world.followers = [...FOLLOWER_ADDRESSES]
    }
  },
  {
    name: 'followers list is empty',
    pattern: /^the followers list is empty$/,
    run (m, example, world) {
      world.followers = []
    }
  },
  {
    name: 'followers request fails',
    pattern: /^the followers request fails$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'memo-followers command runs without an address',
    pattern: /^the memo-followers command runs without an address$/,
    async run (m, example, world) {
      await runFollowers(world, {})
    }
  },
  {
    name: 'memo-followers command runs for an address',
    pattern: /^the memo-followers command runs for "(.+)"$/,
    async run (m, example, world) {
      await runFollowers(world, { addr: resolveParam(m[1], example) })
    }
  },
  {
    name: 'service received a followers request',
    pattern: /^the service received a followers request for "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.lastRequest?.pathname, `/follow/followers/${resolveParam(m[1], example)}`, 'request path')
    }
  },
  {
    name: 'command reported the follower addresses',
    pattern: /^the command reported the follower addresses "(.+)"$/,
    run (m, example, world) {
      assertReportedAddresses(world.readJson?.followers, resolveParam(m[1], example), 'follower addresses')
    }
  },
  {
    name: 'command reported no follower addresses',
    pattern: /^the command reported 0 follower addresses$/,
    run (m, example, world) {
      assertEqual((world.readJson?.followers || []).length, 0, 'follower count')
    }
  },
  {
    name: 'memo-followers command reported the usage error',
    pattern: /^the memo-followers command reported the usage error "(.+)"$/,
    run (m, example, world) {
      assertUsageError(world, 'followers', 'memo-followers', resolveParam(m[1], example))
    }
  },
  {
    name: 'memo-followers command reported an error',
    pattern: /^the memo-followers command reported an error$/,
    run (m, example, world) {
      assertReadCommandError(world, 'followers', 'memo-followers')
    }
  }
]

export { memoFollowersHandlers }
