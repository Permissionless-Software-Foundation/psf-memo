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
import { broadcastCommandHandlers } from './steps/broadcast-command.js'
import { memoBroadcastHandlers } from './steps/memo-broadcast.js'
import { outputContractHandlers } from './steps/output-contract.js'
import { walletSourceHandlers } from './steps/wallet-source.js'
import { wireEncodingHandlers } from './steps/wire-encoding.js'

const handlers = [
  ...memoDbHandlers,
  ...memoFeedHandlers,
  ...memoThreadHandlers,
  ...memoGetPostHandlers,
  ...memoStatusHandlers,
  ...memoIdentityHandlers,
  ...memoPostHandlers,
  ...memoReplyHandlers,
  ...broadcastCommandHandlers,
  ...memoBroadcastHandlers,
  ...outputContractHandlers,
  ...walletSourceHandlers,
  ...wireEncodingHandlers
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
    status: null,
    nameStore: {},
    profileStore: {},
    profilePicStore: {},
    identityWallets: {},
    missingProfiles: new Set(),
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

  world.fetch = async (url) => {
    world.lastRequest = new URL(url)

    if (world.unreachable) {
      throw new TypeError('fetch failed')
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

    if (world.lastRequest.pathname === '/posts/recent') {
      const limit = Number.parseInt(world.lastRequest.searchParams.get('limit') || '50', 10)
      const offset = Number.parseInt(world.lastRequest.searchParams.get('offset') || '0', 10)
      const page = world.posts.slice(offset, offset + limit)
      const pagination = {
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
