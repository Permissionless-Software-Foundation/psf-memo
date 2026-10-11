/*
  Gherkin step handlers for the Memo Following Feed feature.

  The scenario world resolves a fake viewer wallet and serves a five-post
  Following feed fixture through the same fake fetch used by the Memo DB client
  handlers. Each scenario runs the real memo-following-feed command in JSON mode
  so the requested page, the reported posts, and the pagination can be asserted
  from the captured stdout.
*/

// Local libraries
import MemoFollowingFeed from '../../../src/commands/memo-following-feed.js'
import {
  runReadCommand,
  installWalletFactory,
  setWalletAddress,
  assertUsageError,
  assertReadCommandError
} from '../read-command.js'
import { findReportedItem, assertPageRequest } from './read-result.js'
import { assertEqual, resolveParam } from '../step-support.js'

// Five top-level posts from five followed authors, newest first.
const FOLLOWING_FEED = [
  { txid: 'feed-1', addr: 'authorA', text: 'first memo', replyCount: 0, likeCount: 1, blockHeight: 600005, seen: 5 },
  { txid: 'feed-2', addr: 'authorB', text: 'second memo', replyCount: 0, likeCount: 0, blockHeight: 600004, seen: 4 },
  { txid: 'feed-3', addr: 'authorC', text: 'third memo', replyCount: 1, likeCount: 2, blockHeight: 600003, seen: 3 },
  { txid: 'feed-4', addr: 'authorD', text: 'fourth memo', replyCount: 0, likeCount: 0, blockHeight: 600002, seen: 2 },
  { txid: 'feed-5', addr: 'authorE', text: 'fifth memo', replyCount: 0, likeCount: 0, blockHeight: 600001, seen: 1 }
]

async function runFollowingFeed (world, flags) {
  await runReadCommand(
    world,
    MemoFollowingFeed,
    'followingFeed',
    { ...world.followingFeedSource, ...flags }
  )
}

const memoFollowingFeedHandlers = [
  {
    name: 'a Memo following feed command',
    pattern: /^a Memo following feed command$/,
    run (m, example, world) {
      installWalletFactory(world, 'followingFeed')
    }
  },
  {
    name: 'service serves the following feed',
    pattern: /^the Memo DB service serves the following feed$/,
    run (m, example, world) {
      world.followingFeed = FOLLOWING_FEED.map((post) => ({ ...post }))
    }
  },
  {
    name: 'the following feed is empty',
    pattern: /^the following feed is empty$/,
    run (m, example, world) {
      world.followingFeed = []
    }
  },
  {
    name: 'the following feed request fails',
    pattern: /^the following feed request fails$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'following feed viewer wallet has an address',
    pattern: /^the following feed viewer wallet has the address "(.+)"$/,
    run (m, example, world) {
      setWalletAddress(world, 'followingFeed', 'viewer-wallet', resolveParam(m[1], example))
    }
  },
  {
    name: 'memo-following-feed command runs',
    pattern: /^the memo-following-feed command runs$/,
    async run (m, example, world) {
      await runFollowingFeed(world, {})
    }
  },
  {
    name: 'memo-following-feed command runs with a page',
    pattern: /^the memo-following-feed command runs with limit (.+) and offset (.+)$/,
    async run (m, example, world) {
      await runFollowingFeed(world, {
        limit: resolveParam(m[1], example),
        offset: resolveParam(m[2], example)
      })
    }
  },
  {
    name: 'service received a following feed request',
    pattern: /^the service received a following feed request for "([^"]+)" with limit (.+) and offset (.+)$/,
    run (m, example, world) {
      assertPageRequest(
        world,
        `/posts/following/${encodeURIComponent(resolveParam(m[1], example))}`,
        resolveParam(m[2], example),
        resolveParam(m[3], example)
      )
    }
  },
  {
    name: 'command reported a post author and text',
    pattern: /^the command reported post "([^"]+)" authored by "([^"]+)" with text "(.*)"$/,
    run (m, example, world) {
      const post = findReportedItem(
        world.readJson?.posts,
        'txid',
        resolveParam(m[1], example),
        'a reported post'
      )
      assertEqual(post.addr, resolveParam(m[2], example), 'post author', { quote: true })
      assertEqual(post.text, resolveParam(m[3], example), 'post text', { quote: true })
    }
  },
  {
    name: 'memo-following-feed command reported the usage error',
    pattern: /^the memo-following-feed command reported the usage error "(.+)"$/,
    run (m, example, world) {
      assertUsageError(world, 'followingFeed', 'memo-following-feed', resolveParam(m[1], example))
    }
  },
  {
    name: 'memo-following-feed command reported an error',
    pattern: /^the memo-following-feed command reported an error$/,
    run (m, example, world) {
      assertReadCommandError(world, 'followingFeed', 'memo-following-feed')
    }
  }
]

export { memoFollowingFeedHandlers }
