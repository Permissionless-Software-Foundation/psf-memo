/*
  Gherkin step handlers for the Memo Following feature.

  The scenario world resolves a fake follower wallet and serves the following
  list through the same fake fetch used by the Memo DB client handlers. Each
  scenario runs the real memo-following command in JSON mode so the requested
  follower address, the reported followee addresses, and the usage/error
  outcomes can be asserted from the captured stdout.
*/

// Local libraries
import MemoFollowing from '../../../src/commands/memo-following.js'
import { runReadCommand, installWalletFactory, setWalletAddress, assertUsageError, assertReadCommandError } from '../read-command.js'
import { assertReportedAddresses } from './read-result.js'
import { assertEqual, resolveParam } from '../step-support.js'

// The default following list served by the fake service.
const FOLLOWING_ADDRESSES = ['addrB', 'addrC']

async function runFollowing (world, flags) {
  await runReadCommand(
    world,
    MemoFollowing,
    'following',
    { ...world.followingSource, ...flags },
    { walletUtil: world.walletUtil }
  )
}

const memoFollowingHandlers = [
  {
    name: 'a Memo following command',
    pattern: /^a Memo following command$/,
    run (m, example, world) {
      installWalletFactory(world, 'following')
    }
  },
  {
    name: 'service serves the following list',
    pattern: /^the Memo DB service serves the following list$/,
    run (m, example, world) {
      world.following = [...FOLLOWING_ADDRESSES]
    }
  },
  {
    name: 'following list is empty',
    pattern: /^the following list is empty$/,
    run (m, example, world) {
      world.following = []
    }
  },
  {
    name: 'following request fails',
    pattern: /^the following request fails$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'the following wallet has an address',
    pattern: /^the following wallet has the address "(.+)"$/,
    run (m, example, world) {
      setWalletAddress(world, 'following', 'following-wallet', resolveParam(m[1], example))
    }
  },
  {
    name: 'memo-following command runs',
    pattern: /^the memo-following command runs$/,
    async run (m, example, world) {
      await runFollowing(world, {})
    }
  },
  {
    name: 'service received a following request',
    pattern: /^the service received a following request for "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.lastRequest?.pathname, `/follow/following/${resolveParam(m[1], example)}`, 'request path')
    }
  },
  {
    name: 'command reported the following addresses',
    pattern: /^the command reported the following addresses "(.+)"$/,
    run (m, example, world) {
      assertReportedAddresses(world.readJson?.following, resolveParam(m[1], example), 'following addresses')
    }
  },
  {
    name: 'command reported no following addresses',
    pattern: /^the command reported 0 following addresses$/,
    run (m, example, world) {
      assertEqual((world.readJson?.following || []).length, 0, 'following count')
    }
  },
  {
    name: 'memo-following command reported the usage error',
    pattern: /^the memo-following command reported the usage error "(.+)"$/,
    run (m, example, world) {
      assertUsageError(world, 'following', 'memo-following', resolveParam(m[1], example))
    }
  },
  {
    name: 'memo-following command reported an error',
    pattern: /^the memo-following command reported an error$/,
    run (m, example, world) {
      assertReadCommandError(world, 'following', 'memo-following')
    }
  }
]

export { memoFollowingHandlers }
