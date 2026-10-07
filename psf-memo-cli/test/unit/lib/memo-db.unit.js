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

// Resolve to the error a promise rejects with, or null when it resolves.
async function captureError (promise) {
  try {
    await promise
  } catch (err) {
    return err
  }
  return null
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

    it('defaults the page to limit 50 and offset 0', async () => {
      let requested
      const client = new MemoDb({
        envUrl: null,
        fetchImpl: async (url) => {
          requested = url
          return jsonResponse({ posts: [] })
        }
      })

      await client.getRecentPosts()

      const url = new URL(requested)
      assert.equal(url.searchParams.get('limit'), '50')
      assert.equal(url.searchParams.get('offset'), '0')
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
      const client = new MemoDb({
        envUrl: null,
        fetchImpl: async () => jsonResponse({ message: 'Post not found.' }, 404)
      })

      assert.isNull(await client.getThread('missing'))
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
      const client = new MemoDb({
        envUrl: null,
        fetchImpl: async () => jsonResponse({ message: 'not found' }, 404)
      })

      assert.isNull(await client.getPost('post-missing'))
    })
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
