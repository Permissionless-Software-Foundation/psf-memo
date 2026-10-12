/*
  Scenario world and step dispatch for the psf-memo-cli acceptance pipeline.

  Per-feature step handlers live under ./steps/; this module builds the shared
  scenario world (the Memo DB fake fetch and the command outcome) and dispatches
  each Gherkin step to the matching handler.
*/

// Local libraries
import MemoDb from '../../src/lib/memo-db.js'
import { UsageError } from '../../src/lib/reporter.js'
import { memoDbHandlers } from './steps/memo-db.js'
import { memoFeedHandlers } from './steps/memo-feed.js'
import { memoThreadHandlers } from './steps/memo-thread.js'
import { memoGetPostHandlers } from './steps/memo-get-post.js'
import { memoStatusHandlers } from './steps/memo-status.js'
import { memoIdentityHandlers } from './steps/memo-identity.js'
import { memoPostHandlers } from './steps/memo-post.js'
import { memoReplyHandlers } from './steps/memo-reply.js'
import { memoLikeHandlers } from './steps/memo-like.js'
import { memoWaitHandlers } from './steps/memo-wait.js'
import { memoNotificationsHandlers } from './steps/memo-notifications.js'
import { memoProfileHandlers } from './steps/memo-profile.js'
import { memoPostsHandlers } from './steps/memo-posts.js'
import { memoTopicsHandlers } from './steps/memo-topics.js'
import { memoTopicHandlers } from './steps/memo-topic.js'
import { memoSearchHandlers } from './steps/memo-search.js'
import { memoProfilesHandlers } from './steps/memo-profiles.js'
import { memoFollowingHandlers } from './steps/memo-following.js'
import { memoFollowingFeedHandlers } from './steps/memo-following-feed.js'
import { memoFollowersHandlers } from './steps/memo-followers.js'
import { memoMutedHandlers } from './steps/memo-muted.js'
import { memoPollHandlers } from './steps/memo-poll.js'
import { memoNameHandlers } from './steps/memo-name.js'
import { memoBioHandlers } from './steps/memo-bio.js'
import { memoAvatarHandlers } from './steps/memo-avatar.js'
import { addressCommandHandlers } from './steps/address-commands.js'
import { topicCommandHandlers } from './steps/topic-commands.js'
import { fileUploadHandlers } from './steps/file-upload.js'
import { fileHostHandlers } from './steps/file-host.js'
import { fileStatusHandlers } from './steps/file-status.js'
import { fileCheckHandlers } from './steps/file-check.js'
import { readResultHandlers } from './steps/read-result.js'
import { identityHandlers } from './steps/identity-support.js'
import { broadcastCommandHandlers } from './steps/broadcast-command.js'
import { memoBroadcastHandlers } from './steps/memo-broadcast.js'
import { outputContractHandlers } from './steps/output-contract.js'
import { walletSourceHandlers } from './steps/wallet-source.js'
import { wireEncodingHandlers } from './steps/wire-encoding.js'
import { secretHygieneHandlers } from './steps/secret-hygiene.js'
import { readOnlySafetyHandlers } from './steps/read-only-safety.js'
import { cliJsonOutputHandlers } from './steps/cli-json-output.js'
import { walletStdoutHygieneHandlers } from './steps/wallet-stdout-hygiene.js'
import { lockfileRegistryHandlers } from './steps/lockfile-registry.js'
import { walletListEmptyStoreHandlers } from './steps/wallet-list-empty-store.js'

const handlers = [
  ...memoDbHandlers,
  ...memoFeedHandlers,
  ...memoThreadHandlers,
  ...memoGetPostHandlers,
  ...memoStatusHandlers,
  ...memoIdentityHandlers,
  ...memoPostHandlers,
  ...memoReplyHandlers,
  ...memoLikeHandlers,
  ...memoWaitHandlers,
  ...memoNotificationsHandlers,
  ...memoProfileHandlers,
  ...memoPostsHandlers,
  ...memoTopicsHandlers,
  ...memoTopicHandlers,
  ...memoSearchHandlers,
  ...memoProfilesHandlers,
  ...memoFollowingHandlers,
  ...memoFollowingFeedHandlers,
  ...memoFollowersHandlers,
  ...memoMutedHandlers,
  ...memoPollHandlers,
  ...memoNameHandlers,
  ...memoBioHandlers,
  ...memoAvatarHandlers,
  ...addressCommandHandlers,
  ...topicCommandHandlers,
  ...cliJsonOutputHandlers,
  ...fileUploadHandlers,
  ...fileHostHandlers,
  ...fileStatusHandlers,
  ...fileCheckHandlers,
  ...readResultHandlers,
  ...identityHandlers,
  ...broadcastCommandHandlers,
  ...memoBroadcastHandlers,
  ...outputContractHandlers,
  ...walletSourceHandlers,
  ...wireEncodingHandlers,
  ...secretHygieneHandlers,
  ...readOnlySafetyHandlers,
  ...walletStdoutHygieneHandlers,
  ...lockfileRegistryHandlers,
  ...walletListEmptyStoreHandlers
]

// A minimal fetch Response stand-in carrying a JSON body.
function jsonResponse (body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  }
}

async function createWorld () {
  const world = {
    flagUrl: undefined,
    envUrl: undefined,
    posts: [],
    threads: {},
    postStore: {},
    pollStore: {},
    notifications: [],
    profilePosts: [],
    followingFeed: [],
    followState: false,
    following: [],
    followers: [],
    mutedByMuter: {},
    topics: [],
    topicPostsByRoom: {},
    searchPosts: [],
    searchProfiles: [],
    recentProfiles: [],
    status: null,
    nameStore: {},
    profileStore: {},
    profilePicStore: {},
    identityWallets: {},
    missingProfiles: new Set(),
    hostingQuote: null,
    hostingAlreadyHosted: false,
    hostingDownloadUrl: null,
    hostingViewUrl: null,
    hostingPaid: null,
    hostingError: null,
    hostingUnpaidFirst: false,
    hostingNeverConfirms: false,
    hostingCheckPaymentCount: 0,
    hostingCheckPaymentAddress: null,
    hostingUnpaid: null,
    hostingExpired: false,
    hostingCheckError: null,
    hostingJson: null,
    hostingFile: {},
    hostingFileStatus: null,
    hostingHostedUntil: null,
    hostingPins: [],
    hostingStatusError: null,
    localFiles: { './photo.jpg': 'photo bytes' },
    walletPayments: [],
    sleepCalls: [],
    unreachable: false,
    lastRequest: null,
    lastResult: null,
    lastError: null,
    json: false,
    outcome: null,
    exitCode: null,
    stdoutText: '',
    stderrText: ''
  }

  world.fetch = async (url, options = {}) => {
    world.lastRequest = new URL(url)

    if (world.unreachable) {
      throw new TypeError('fetch failed')
    }

    if (world.lastRequest.pathname === '/files' && options.method === 'POST') {
      if (world.hostingError) {
        return jsonResponse({ success: false, error: world.hostingError }, 422)
      }
      if (world.hostingAlreadyHosted) {
        return jsonResponse(
          {
            success: true,
            alreadyHosted: true,
            downloadUrl: world.hostingDownloadUrl,
            viewUrl: world.hostingViewUrl
          },
          200
        )
      }
      return jsonResponse({ success: true, ...(world.hostingFile || {}), ...(world.hostingQuote || {}) }, 200)
    }

    if (world.lastRequest.pathname.startsWith('/files/') && options.method === 'GET') {
      if (world.hostingStatusError) {
        return jsonResponse({ success: false, error: world.hostingStatusError }, 404)
      }
      const cid = decodeURIComponent(world.lastRequest.pathname.slice('/files/'.length))
      return jsonResponse(
        {
          success: true,
          cid,
          ...(world.hostingFile || {}),
          status: world.hostingFileStatus,
          hostedUntil: world.hostingHostedUntil,
          pins: world.hostingPins
        },
        200
      )
    }

    if (world.lastRequest.pathname === '/files/check-payment' && options.method === 'POST') {
      world.hostingCheckPaymentCount++
      world.hostingCheckPaymentAddress = JSON.parse(options.body).paymentAddress

      if (world.hostingCheckError) {
        return jsonResponse({ success: false, error: world.hostingCheckError }, 404)
      }
      if (world.hostingExpired) {
        return jsonResponse({ success: true, status: 'expired' }, 200)
      }
      if (world.hostingUnpaid) {
        return jsonResponse(
          {
            success: true,
            status: 'unpaid',
            ...world.hostingUnpaid,
            quoteExpiresAt: world.hostingQuote?.quoteExpiresAt
          },
          200
        )
      }
      if (world.hostingNeverConfirms || (world.hostingUnpaidFirst && world.hostingCheckPaymentCount === 1)) {
        return jsonResponse({ success: true, status: 'unpaid' }, 200)
      }
      return jsonResponse(
        {
          success: true,
          status: 'paid',
          ...(world.hostingPaid || {}),
          downloadUrl: world.hostingDownloadUrl,
          viewUrl: world.hostingViewUrl
        },
        200
      )
    }

    if (world.lastRequest.pathname.startsWith('/level/name/')) {
      const addr = decodeURIComponent(world.lastRequest.pathname.split('/').pop())
      const doc = world.nameStore[addr]
      return doc ? jsonResponse(doc, 200) : jsonResponse({ message: 'not found' }, 404)
    }

    if (world.lastRequest.pathname.startsWith('/level/profilepic/')) {
      const addr = decodeURIComponent(world.lastRequest.pathname.split('/').pop())
      const doc = world.profilePicStore[addr]
      return doc ? jsonResponse(doc, 200) : jsonResponse({ message: 'not found' }, 404)
    }

    if (world.lastRequest.pathname.startsWith('/level/profile/')) {
      const addr = decodeURIComponent(world.lastRequest.pathname.split('/').pop())
      if (world.missingProfiles.has(addr) || world.profileStore[addr] === null) {
        return jsonResponse({ message: 'not found' }, 404)
      }
      return jsonResponse(world.profileStore[addr] || { addr, text: 'bio' }, 200)
    }

    if (world.lastRequest.pathname.startsWith('/level/post/')) {
      const txid = decodeURIComponent(world.lastRequest.pathname.split('/').pop())
      if (!(txid in world.postStore)) {
        return jsonResponse({ message: 'not found' }, 404)
      }
      return jsonResponse(world.postStore[txid], 200)
    }

    if (world.lastRequest.pathname.startsWith('/level/status/')) {
      if (!world.status) {
        return jsonResponse({ message: 'not found' }, 404)
      }
      return jsonResponse(world.status, 200)
    }

    if (world.lastRequest.pathname.startsWith('/polls/')) {
      const txid = decodeURIComponent(world.lastRequest.pathname.split('/')[2] || '')
      if (!(txid in world.pollStore)) {
        return jsonResponse({ message: 'not found' }, 404)
      }
      return jsonResponse({ ...world.pollStore[txid], txid }, 200)
    }

    if (world.lastRequest.pathname.startsWith('/posts/notifications/')) {
      const limit = Number.parseInt(world.lastRequest.searchParams.get('limit') || '50', 10)
      const offset = Number.parseInt(world.lastRequest.searchParams.get('offset') || '0', 10)
      const page = world.notifications.slice(offset, offset + limit)
      const pagination = {
        limit,
        offset,
        total: world.notifications.length,
        hasMore: offset + limit < world.notifications.length
      }
      return jsonResponse({ notifications: page, pagination }, 200)
    }

    if (world.lastRequest.pathname.startsWith('/posts/by/')) {
      const limit = Number.parseInt(world.lastRequest.searchParams.get('limit') || '50', 10)
      const offset = Number.parseInt(world.lastRequest.searchParams.get('offset') || '0', 10)
      const page = world.profilePosts.slice(offset, offset + limit)
      const pagination = {
        limit,
        offset,
        total: world.profilePosts.length,
        hasMore: offset + limit < world.profilePosts.length
      }
      return jsonResponse({ posts: page, pagination }, 200)
    }

    if (world.lastRequest.pathname.startsWith('/posts/following/')) {
      const limit = Number.parseInt(world.lastRequest.searchParams.get('limit') || '50', 10)
      const offset = Number.parseInt(world.lastRequest.searchParams.get('offset') || '0', 10)
      const page = world.followingFeed.slice(offset, offset + limit)
      const pagination = {
        limit,
        offset,
        total: world.followingFeed.length,
        hasMore: offset + limit < world.followingFeed.length
      }
      return jsonResponse({ posts: page, pagination }, 200)
    }

    if (world.lastRequest.pathname === '/follow/state') {
      return jsonResponse({
        followerAddr: world.lastRequest.searchParams.get('follower'),
        followeeAddr: world.lastRequest.searchParams.get('followee'),
        following: world.followState === true
      }, 200)
    }

    if (world.lastRequest.pathname.startsWith('/follow/following/')) {
      const addr = decodeURIComponent(world.lastRequest.pathname.split('/').pop() || '')
      return jsonResponse({ followerAddr: addr, following: [...world.following] }, 200)
    }

    if (world.lastRequest.pathname.startsWith('/follow/followers/')) {
      const addr = decodeURIComponent(world.lastRequest.pathname.split('/').pop() || '')
      return jsonResponse({ followeeAddr: addr, followers: [...world.followers] }, 200)
    }

    if (world.lastRequest.pathname.startsWith('/mute/muted/')) {
      const addr = decodeURIComponent(world.lastRequest.pathname.split('/').pop() || '')
      return jsonResponse({ muterAddr: addr, muted: [...(world.mutedByMuter[addr] || [])] }, 200)
    }

    if (world.lastRequest.pathname === '/topics') {
      const limit = Number.parseInt(world.lastRequest.searchParams.get('limit') || '50', 10)
      const offset = Number.parseInt(world.lastRequest.searchParams.get('offset') || '0', 10)
      const page = world.topics.slice(offset, offset + limit)
      const pagination = {
        limit,
        offset,
        total: world.topics.length,
        hasMore: offset + limit < world.topics.length
      }
      return jsonResponse({ topics: page, pagination }, 200)
    }

    if (world.lastRequest.pathname.startsWith('/topics/') && world.lastRequest.pathname.endsWith('/posts')) {
      const room = decodeURIComponent(world.lastRequest.pathname.split('/')[2] || '')
      const posts = world.topicPostsByRoom[room] || []
      const limit = Number.parseInt(world.lastRequest.searchParams.get('limit') || '50', 10)
      const offset = Number.parseInt(world.lastRequest.searchParams.get('offset') || '0', 10)
      const page = posts.slice(offset, offset + limit)
      const pagination = {
        limit,
        offset,
        total: posts.length,
        hasMore: offset + limit < posts.length
      }
      return jsonResponse({ posts: page, pagination }, 200)
    }

    if (world.lastRequest.pathname === '/search') {
      const limit = Number.parseInt(world.lastRequest.searchParams.get('limit') || '50', 10)
      const offset = Number.parseInt(world.lastRequest.searchParams.get('offset') || '0', 10)
      const posts = world.searchPosts.slice(offset, offset + limit)
      const profiles = world.searchProfiles.slice(offset, offset + limit)
      const total = world.searchPosts.length + world.searchProfiles.length
      const pagination = {
        limit,
        offset,
        total,
        hasMore: offset + posts.length + profiles.length < total
      }
      return jsonResponse({ posts, profiles, pagination }, 200)
    }

    if (world.lastRequest.pathname === '/profile/recent') {
      const limit = Number.parseInt(world.lastRequest.searchParams.get('limit') || '50', 10)
      const offset = Number.parseInt(world.lastRequest.searchParams.get('offset') || '0', 10)
      const profiles = world.recentProfiles.slice(offset, offset + limit)
      const pagination = {
        limit,
        offset,
        total: world.recentProfiles.length,
        hasMore: offset + profiles.length < world.recentProfiles.length
      }
      return jsonResponse({ profiles, pagination }, 200)
    }

    if (world.lastRequest.pathname === '/posts/recent') {
      const limit = Number.parseInt(world.lastRequest.searchParams.get('limit') || '50', 10)
      const offset = Number.parseInt(world.lastRequest.searchParams.get('offset') || '0', 10)
      const page = world.posts.slice(offset, offset + limit)
      // A scenario may pin the service pagination (for example the documented
      // recent-feed total cap of 500); otherwise derive it from the fixture.
      const pagination = world.feedPagination || {
        limit,
        offset,
        total: world.posts.length,
        hasMore: offset + limit < world.posts.length
      }
      return jsonResponse({ posts: page, pagination }, 200)
    }

    if (world.lastRequest.pathname.startsWith('/posts/') && world.lastRequest.pathname.endsWith('/thread')) {
      // ['', 'posts', '<txid>', 'thread']
      const txid = decodeURIComponent(world.lastRequest.pathname.split('/')[2] || '')
      if (!(txid in world.threads)) {
        return jsonResponse({ message: 'Post not found.' }, 404)
      }
      return jsonResponse({ post: world.threads[txid] }, 200)
    }

    return jsonResponse({ message: 'not found' }, 404)
  }

  // Build a client using the overrides configured for this scenario.
  world.client = () => new MemoDb({
    dbUrl: world.flagUrl,
    envUrl: world.envUrl,
    fetchImpl: world.fetch
  })

  // Read a local file for the file-* commands. Known files resolve to bytes;
  // anything else fails the way a missing path does, without touching disk.
  world.readFile = (filePath) => {
    if (Object.prototype.hasOwnProperty.call(world.localFiles, filePath)) {
      return Buffer.from(world.localFiles[filePath])
    }
    throw new Error(`ENOENT: no such file or directory, open '${filePath}'`)
  }

  // Reproduce the scenario's command outcome as a runnable command.
  world.command = async () => {
    if (world.outcome.type === 'result') return { message: world.outcome.message }
    if (world.outcome.type === 'usage') throw new UsageError(world.outcome.message)
    throw new Error(world.outcome.message)
  }

  return world
}

async function handleStep (step, example, world) {
  for (const handler of handlers) {
    const match = handler.pattern.exec(step.text)
    if (match) {
      await handler.run(match, example, world, step)
      return
    }
  }
  throw new Error(`Unsupported step: ${step.keyword} ${step.text}`)
}

export { createWorld, handleStep }
