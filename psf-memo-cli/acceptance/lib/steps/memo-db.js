/*
  Gherkin step handlers for the Memo DB client feature.

  The scenario world (built in handlers.js) supplies a fake fetch that records
  the request and serves a small in-memory service, so these steps exercise the
  real client without network access.
*/

// Local libraries
import { resolveParam } from '../step-support.js'

function makePosts (count) {
  const posts = []
  for (let i = 0; i < count; i++) {
    posts.push({
      txid: `post-${i}`,
      addr: `bitcoincash:qaddr-${i}`,
      text: `post ${i}`,
      seen: i,
      blockHeight: 600000 + i
    })
  }
  return posts
}

const memoDbHandlers = [
  {
    name: 'a Memo DB client is available',
    pattern: /^a Memo DB client$/,
    run (m, example, world) {
      world.lastError = null
    }
  },
  {
    name: 'no endpoint override',
    pattern: /^no Memo DB endpoint override is configured$/,
    run (m, example, world) {
      world.flagUrl = null
      world.envUrl = null
    }
  },
  {
    name: 'MEMO_DB_URL is set',
    pattern: /^the MEMO_DB_URL environment variable is (.+)$/,
    run (m, example, world) {
      world.envUrl = resolveParam(m[1], example)
    }
  },
  {
    name: 'db-url flag is set',
    pattern: /^the --db-url flag is (.+)$/,
    run (m, example, world) {
      world.flagUrl = resolveParam(m[1], example)
    }
  },
  {
    name: 'resolve the endpoint',
    pattern: /^the Memo DB client resolves its endpoint$/,
    run (m, example, world) {
      world.endpoint = world.client().endpoint
    }
  },
  {
    name: 'resolved endpoint',
    pattern: /^the resolved endpoint is (.+)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      if (world.endpoint !== expected) {
        throw new Error(`Expected endpoint ${expected}, got ${world.endpoint}`)
      }
    }
  },
  {
    name: 'service serves recent posts',
    pattern: /^the Memo DB service serves (.+) recent posts$/,
    run (m, example, world) {
      world.posts = makePosts(Number.parseInt(resolveParam(m[1], example), 10))
    }
  },
  {
    name: 'request recent posts page',
    pattern: /^the Memo DB client requests recent posts with limit (.+) and offset (.+)$/,
    async run (m, example, world) {
      const limit = Number.parseInt(resolveParam(m[1], example), 10)
      const offset = Number.parseInt(resolveParam(m[2], example), 10)
      world.lastResult = await world.client().getRecentPosts({ limit, offset })
    }
  },
  {
    name: 'request recent posts for viewer',
    pattern: /^the Memo DB client requests recent posts for the viewer (.+)$/,
    async run (m, example, world) {
      const viewer = resolveParam(m[1], example)
      world.lastResult = await world.client().getRecentPosts({ viewer })
    }
  },
  {
    name: 'request recent posts',
    pattern: /^the Memo DB client requests recent posts$/,
    async run (m, example, world) {
      try {
        world.lastResult = await world.client().getRecentPosts()
      } catch (err) {
        world.lastError = err
      }
    }
  },
  {
    name: 'client returned a post count',
    pattern: /^the Memo DB client returns (.+) posts$/,
    run (m, example, world) {
      const expected = Number.parseInt(resolveParam(m[1], example), 10)
      const actual = world.lastResult?.posts?.length
      if (actual !== expected) {
        throw new Error(`Expected ${expected} posts, got ${actual}`)
      }
    }
  },
  {
    name: 'service received a recent-posts request',
    pattern: /^the service received a request for \/posts\/recent with limit (.+) and offset (.+)$/,
    run (m, example, world) {
      const limit = resolveParam(m[1], example)
      const offset = resolveParam(m[2], example)
      if (world.lastRequest?.pathname !== '/posts/recent') {
        throw new Error(`Expected a /posts/recent request, got ${world.lastRequest?.pathname}`)
      }
      if (world.lastRequest.searchParams.get('limit') !== limit) {
        throw new Error(`Expected limit ${limit}, got ${world.lastRequest.searchParams.get('limit')}`)
      }
      if (world.lastRequest.searchParams.get('offset') !== offset) {
        throw new Error(`Expected offset ${offset}, got ${world.lastRequest.searchParams.get('offset')}`)
      }
    }
  },
  {
    name: 'service received the viewer parameter',
    pattern: /^the service received the viewer query parameter (.+)$/,
    run (m, example, world) {
      const viewer = resolveParam(m[1], example)
      if (world.lastRequest?.searchParams.get('viewer') !== viewer) {
        throw new Error(`Expected viewer ${viewer}, got ${world.lastRequest?.searchParams.get('viewer')}`)
      }
    }
  },
  {
    name: 'service has no profile for addr',
    pattern: /^the Memo DB service has no profile for the address (.+)$/,
    run (m, example, world) {
      world.missingProfiles.add(resolveParam(m[1], example))
    }
  },
  {
    name: 'read the profile for addr',
    pattern: /^the Memo DB client reads the profile for the address (.+)$/,
    async run (m, example, world) {
      const addr = resolveParam(m[1], example)
      world.lastResult = await world.client().getProfile(addr)
    }
  },
  {
    name: 'client reports no profile',
    pattern: /^the Memo DB client reports no profile$/,
    run (m, example, world) {
      if (world.lastResult !== null) {
        throw new Error(`Expected no profile, got ${JSON.stringify(world.lastResult)}`)
      }
    }
  },
  {
    name: 'service is unreachable',
    pattern: /^the Memo DB service is unreachable$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'client reports an error',
    pattern: /^the Memo DB client reports an error$/,
    run (m, example, world) {
      if (!(world.lastError instanceof Error)) {
        throw new Error('Expected the Memo DB client to report an error')
      }
    }
  }
]

export { memoDbHandlers }
