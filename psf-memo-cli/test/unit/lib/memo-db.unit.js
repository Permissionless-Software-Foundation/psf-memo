/*
  Unit tests for the read-only psf-memo-db HTTP client.

  These pin the endpoint precedence (--db-url > MEMO_DB_URL > production
  default), request construction, 404-as-no-data for /level resources, and the
  transport/server error contract.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoDb, {
  DEFAULT_MEMO_DB_URL,
  resolveMemoDbUrl
} from '../../../src/lib/memo-db.js'

// A minimal fetch Response stand-in carrying a JSON body.
function jsonResponse (body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  }
}

// Build a MemoDb whose fetch records the requested URL and returns `response`,
// exposing the parsed request URL for assertions.
function recordingClient (response) {
  let requested
  const client = new MemoDb({
    envUrl: null,
    fetchImpl: async (url) => {
      requested = url
      return jsonResponse(response)
    }
  })
  return { client, requestedUrl: () => new URL(requested) }
}

// Resolve to the error a promise rejects with, or null when it resolves.
async function captureError (promise) {
  try {
    await promise
  } catch (err) {
    return err
  }
  return null
}

// Build a client whose fetch always returns 404 and assert the given getter
// resolves a missing resource to null.
async function assertMissingResource (method, arg) {
  const client = new MemoDb({
    envUrl: null,
    fetchImpl: async () => jsonResponse({ message: 'not found' }, 404)
  })

  assert.isNull(await client[method](arg))
}

// Build a client whose fetch records the requested URL and returns `body`, run
// the given getter, assert the request path, and return the parsed result.
async function requestLevelResource (method, addr, path, body) {
  let requested
  const client = new MemoDb({
    envUrl: null,
    fetchImpl: async (url) => {
      requested = url
      return jsonResponse(body)
    }
  })

  const result = await client[method](addr)

  assert.equal(new URL(requested).pathname, path)
  return result
}

describe('#memo-db', () => {
  describe('resolveMemoDbUrl', () => {
    it('defaults to the production memo-db', () => {
      assert.equal(resolveMemoDbUrl({}), DEFAULT_MEMO_DB_URL)
    })

    it('uses MEMO_DB_URL when no flag is given', () => {
      assert.equal(
        resolveMemoDbUrl({ envUrl: 'https://env.example' }),
        'https://env.example'
      )
    })

    it('prefers --db-url over MEMO_DB_URL', () => {
      assert.equal(
        resolveMemoDbUrl({
          flagUrl: 'https://flag.example',
          envUrl: 'https://env.example'
        }),
        'https://flag.example'
      )
    })
  })

  describe('endpoint', () => {
    it('exposes the production default when nothing overrides it', () => {
      const client = new MemoDb({
        envUrl: null,
        fetchImpl: async () => jsonResponse({})
      })

      assert.equal(client.endpoint, DEFAULT_MEMO_DB_URL)
    })

    it('exposes the --db-url override', () => {
      const client = new MemoDb({
        dbUrl: 'https://flag.example',
        envUrl: 'https://env.example',
        fetchImpl: async () => jsonResponse({})
      })

      assert.equal(client.endpoint, 'https://flag.example')
    })

    it('falls back to process.env.MEMO_DB_URL', () => {
      const original = process.env.MEMO_DB_URL
      process.env.MEMO_DB_URL = 'https://process.example'

      try {
        const client = new MemoDb({ fetchImpl: async () => jsonResponse({}) })
        assert.equal(client.endpoint, 'https://process.example')
      } finally {
        if (original === undefined) delete process.env.MEMO_DB_URL
        else process.env.MEMO_DB_URL = original
      }
    })
  })

  describe('default page', () => {
    const cases = [
      { method: 'getRecentPosts', call: (client) => client.getRecentPosts() },
      { method: 'getTopics', call: (client) => client.getTopics() }
    ]

    for (const { method, call } of cases) {
      it(`${method} defaults the page to 50/0`, async () => {
        const { client, requestedUrl } = recordingClient({})

        await call(client)

        const url = requestedUrl()
        assert.equal(url.searchParams.get('limit'), '50')
        assert.equal(url.searchParams.get('offset'), '0')
      })
    }
  })

  describe('getRecentPosts', () => {
    it('requests the page with limit and offset', async () => {
      let requested
      const client = new MemoDb({
        envUrl: null,
        fetchImpl: async (url) => {
          requested = url
          return jsonResponse({ posts: [{ txid: 'a' }], pagination: {} })
        }
      })

      const result = await client.getRecentPosts({ limit: 1, offset: 2 })

      assert.deepEqual(result.posts, [{ txid: 'a' }])
      const url = new URL(requested)
      assert.equal(url.pathname, '/posts/recent')
      assert.equal(url.searchParams.get('limit'), '1')
      assert.equal(url.searchParams.get('offset'), '2')
      assert.isFalse(url.searchParams.has('viewer'))
    })

    it('sends the viewer when one is supplied', async () => {
      let requested
      const client = new MemoDb({
        envUrl: null,
        fetchImpl: async (url) => {
          requested = url
          return jsonResponse({ posts: [] })
        }
      })

      await client.getRecentPosts({ viewer: 'bitcoincash:qviewer' })

      assert.equal(
        new URL(requested).searchParams.get('viewer'),
        'bitcoincash:qviewer'
      )
    })
  })

  describe('getProfile', () => {
    it('returns the profile document', async () => {
      const client = new MemoDb({
        envUrl: null,
        fetchImpl: async () => jsonResponse({ text: 'hi' })
      })

      assert.deepEqual(await client.getProfile('bitcoincash:qaddr'), {
        text: 'hi'
      })
    })

    it('resolves a missing profile to null', async () => {
      let requested
      const client = new MemoDb({
        envUrl: null,
        fetchImpl: async (url) => {
          requested = url
          return jsonResponse({ message: 'not found' }, 404)
        }
      })

      assert.isNull(await client.getProfile('bitcoincash:qaddr'))
      assert.include(requested, encodeURIComponent('bitcoincash:qaddr'))
    })
  })

  describe('getThread', () => {
    it('requests the thread for the txid', async () => {
      let requested
      const client = new MemoDb({
        envUrl: null,
        fetchImpl: async (url) => {
          requested = url
          return jsonResponse({ post: { txid: 'abc' } })
        }
      })

      const result = await client.getThread('abc')

      assert.equal(new URL(requested).pathname, '/posts/abc/thread')
      assert.equal(result.post.txid, 'abc')
    })

    it('encodes the txid in the request path', async () => {
      let requested
      const client = new MemoDb({
        envUrl: null,
        fetchImpl: async (url) => {
          requested = url
          return jsonResponse({ post: {} })
        }
      })

      await client.getThread('a/b')

      assert.equal(new URL(requested).pathname, '/posts/a%2Fb/thread')
    })

    it('resolves an unindexed txid to null', async () => {
      await assertMissingResource('getThread', 'missing')
    })
  })

  describe('getPost', () => {
    it('requests the stored post for the txid', async () => {
      let requested
      const client = new MemoDb({
        envUrl: null,
        fetchImpl: async (url) => {
          requested = url
          return jsonResponse({ addr: 'bitcoincash:qaddr-a', text: 'hi' })
        }
      })

      const result = await client.getPost('post-abc')

      assert.equal(new URL(requested).pathname, '/level/post/post-abc')
      assert.equal(result.text, 'hi')
    })

    it('encodes the txid in the request path', async () => {
      let requested
      const client = new MemoDb({
        envUrl: null,
        fetchImpl: async (url) => {
          requested = url
          return jsonResponse({ text: 'hi' })
        }
      })

      await client.getPost('a/b')

      assert.equal(new URL(requested).pathname, '/level/post/a%2Fb')
    })

    it('resolves a txid with no stored post to null', async () => {
      await assertMissingResource('getPost', 'post-missing')
    })
  })

  describe('getStatus', () => {
    it('requests the indexer status key', async () => {
      let requested
      const client = new MemoDb({
        envUrl: null,
        fetchImpl: async (url) => {
          requested = url
          return jsonResponse({ startBlockHeight: 0, syncedBlockHeight: 0, chainBlockHeight: 750000 })
        }
      })

      const result = await client.getStatus()

      assert.equal(new URL(requested).pathname, '/level/status/status')
      assert.equal(result.chainBlockHeight, 750000)
    })

    it('resolves a missing status to null', async () => {
      await assertMissingResource('getStatus')
    })
  })

  describe('address-scoped post pages', () => {
    const cases = [
      {
        method: 'getNotifications',
        path: 'notifications',
        body: { notifications: [{ txid: 'notif-1' }], pagination: { total: 1 } },
        list: 'notifications'
      },
      {
        method: 'getPostsByAddr',
        path: 'by',
        body: { posts: [{ txid: 'alpha' }], pagination: { total: 1 } },
        list: 'posts'
      }
    ]

    for (const { method, path, body, list } of cases) {
      it(`${method} requests /posts/${path}/:addr with the limit and offset`, async () => {
        const { client, requestedUrl } = recordingClient(body)

        const result = await client[method]('addrA', { limit: 2, offset: 4 })

        const url = requestedUrl()
        assert.equal(url.pathname, `/posts/${path}/addrA`)
        assert.equal(url.searchParams.get('limit'), '2')
        assert.equal(url.searchParams.get('offset'), '4')
        assert.equal(result[list][0].txid, body[list][0].txid)
      })

      it(`${method} defaults the page to 50/0 and encodes the address`, async () => {
        const { client, requestedUrl } = recordingClient(body)

        await client[method]('a/b')

        const url = requestedUrl()
        assert.equal(url.pathname, `/posts/${path}/a%2Fb`)
        assert.equal(url.searchParams.get('limit'), '50')
        assert.equal(url.searchParams.get('offset'), '0')
      })
    }
  })

  describe('getFollowState', () => {
    it('requests the follow state for the follower and followee', async () => {
      let requested
      const client = new MemoDb({
        envUrl: null,
        fetchImpl: async (url) => {
          requested = url
          return jsonResponse({ followerAddr: 'viewerB', followeeAddr: 'addrA', following: true })
        }
      })

      const result = await client.getFollowState('viewerB', 'addrA')

      const url = new URL(requested)
      assert.equal(url.pathname, '/follow/state')
      assert.equal(url.searchParams.get('follower'), 'viewerB')
      assert.equal(url.searchParams.get('followee'), 'addrA')
      assert.equal(result.following, true)
    })
  })

  describe('getTopics', () => {
    it('requests the topic page with limit and offset', async () => {
      const { client, requestedUrl } = recordingClient({ topics: [{ room: 'memo' }], pagination: { total: 1 } })

      const result = await client.getTopics({ limit: 2, offset: 4 })

      const url = requestedUrl()
      assert.equal(url.pathname, '/topics')
      assert.equal(url.searchParams.get('limit'), '2')
      assert.equal(url.searchParams.get('offset'), '4')
      assert.equal(result.topics[0].room, 'memo')
    })
  })

  describe('getTopicPosts', () => {
    it('requests the topic page with limit, offset, and viewer', async () => {
      const { client, requestedUrl } = recordingClient({ posts: [{ txid: 'alpha' }], pagination: { total: 1 } })

      const result = await client.getTopicPosts('general', { limit: 2, offset: 4, viewer: 'viewerB' })

      const url = requestedUrl()
      assert.equal(url.pathname, '/topics/general/posts')
      assert.equal(url.searchParams.get('limit'), '2')
      assert.equal(url.searchParams.get('offset'), '4')
      assert.equal(url.searchParams.get('viewer'), 'viewerB')
      assert.equal(result.posts[0].txid, 'alpha')
    })

    it('defaults the page and omits the viewer', async () => {
      const { client, requestedUrl } = recordingClient({ posts: [] })

      await client.getTopicPosts('a/b')

      const url = requestedUrl()
      assert.equal(url.pathname, '/topics/a%2Fb/posts')
      assert.equal(url.searchParams.get('limit'), '50')
      assert.equal(url.searchParams.get('offset'), '0')
      assert.equal(url.searchParams.has('viewer'), false)
    })
  })

  describe('level name and profile-picture resources', () => {
    const resourceCases = [
      { method: 'getName', path: '/level/name/addrA', body: { name: 'alice' }, field: 'name' },
      { method: 'getProfilePic', path: '/level/profilepic/addrA', body: { url: 'https://example/a.png' }, field: 'url' }
    ]

    for (const { method, path, body, field } of resourceCases) {
      it(`${method} requests its record and returns it`, async () => {
        const result = await requestLevelResource(method, 'addrA', path, body)

        assert.equal(result[field], body[field])
      })

      it(`${method} resolves a missing record to null`, async () => {
        await assertMissingResource(method, 'addrA')
      })
    }
  })

  describe('errors', () => {
    const cases = [
      {
        name: 'a transport failure',
        fetchImpl: async () => {
          throw new TypeError('fetch failed')
        },
        message: 'fetch failed'
      },
      {
        name: 'a server failure',
        fetchImpl: async () => jsonResponse({ message: 'boom' }, 500),
        message: '500'
      },
      {
        name: 'a 404 outside a level resource',
        fetchImpl: async () => jsonResponse({ message: 'not found' }, 404),
        message: '404'
      }
    ]

    for (const { name, fetchImpl, message } of cases) {
      it(`reports ${name} as an error`, async () => {
        const client = new MemoDb({ envUrl: null, fetchImpl })

        const err = await captureError(client.getRecentPosts())

        assert.instanceOf(err, Error)
        assert.include(err.message, message)
      })
    }
  })
})
