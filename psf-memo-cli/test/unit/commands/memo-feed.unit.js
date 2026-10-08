/*
  Unit tests for the memo-feed read command.

  These drive the real command against an injected MemoDb class so the feed
  page, viewer, endpoint override, and failure/usage reporting are pinned
  without a network or wallet.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoFeed from '../../../src/commands/memo-feed.js'
import { captureStream } from '../../support/capture.js'

// Build a MemoDb stand-in that records its constructor options and the
// getRecentPosts parameters, and resolves the supplied result or error.
function fakeMemoDb ({ result, error } = {}) {
  const calls = { opts: null, params: null }
  class FakeMemoDb {
    constructor (opts) {
      calls.opts = opts
    }

    async getRecentPosts (params) {
      calls.params = params
      if (error) throw error
      return result
    }
  }
  return { FakeMemoDb, calls }
}

const page = (posts, pagination = {}) => ({ posts, pagination })

describe('#memo-feed command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('reads the default page and reports posts and pagination as JSON', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb, calls } = fakeMemoDb({
      result: page(
        [{ txid: 'alpha', text: 'first memo', replyCount: 2, likeCount: 3 }],
        { limit: 50, offset: 0, total: 1, hasMore: false }
      )
    })
    const command = new MemoFeed({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true })

    assert.equal(code, 0)
    assert.deepEqual(calls.params, { limit: 50, offset: 0, viewer: null })
    const payload = JSON.parse(out.text())
    assert.equal(payload.posts[0].txid, 'alpha')
    assert.deepEqual(payload.pagination, {
      limit: 50,
      offset: 0,
      total: 1,
      hasMore: false
    })
    assert.equal(err.text(), '')
  })

  it('echoes the service pagination instead of recomputing it from the page', async () => {
    const out = captureStream()
    const { FakeMemoDb } = fakeMemoDb({
      result: page(
        [{ txid: 'alpha', text: 'first memo', replyCount: 0, likeCount: 0 }],
        { limit: 2, offset: 0, total: 10, hasMore: false }
      )
    })
    const command = new MemoFeed({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      stdout: out.stream,
      stderr: captureStream().stream
    })

    const code = await command.run({ json: true, limit: '2', offset: '0' })

    assert.equal(code, 0)
    const payload = JSON.parse(out.text())
    assert.equal(payload.posts.length, 1)
    assert.deepEqual(payload.pagination, { limit: 2, offset: 0, total: 10, hasMore: false })
  })

  it('passes limit, offset, and viewer through to the client', async () => {
    const out = captureStream()
    const { FakeMemoDb, calls } = fakeMemoDb({
      result: page([], { total: 0, hasMore: false })
    })
    const command = new MemoFeed({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      stdout: out.stream,
      stderr: captureStream().stream
    })

    await command.run({
      json: true,
      limit: '2',
      offset: '4',
      viewer: 'bitcoincash:qviewer'
    })

    assert.deepEqual(calls.params, {
      limit: 2,
      offset: 4,
      viewer: 'bitcoincash:qviewer'
    })
  })

  it('reports a failed request on stderr with exit 1', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb } = fakeMemoDb({
      error: new Error('Memo DB request to /posts/recent failed: fetch failed')
    })
    const command = new MemoFeed({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true })

    assert.equal(code, 1)
    assert.equal(out.text(), '')
    assert.deepEqual(JSON.parse(err.text()), {
      error: 'Memo DB request to /posts/recent failed: fetch failed'
    })
  })

  it('rejects a bad limit as a usage error with exit 2', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb } = fakeMemoDb({ result: page([]) })
    const command = new MemoFeed({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true, limit: 'nope' })

    assert.equal(code, 2)
    assert.include(JSON.parse(err.text()).error, '--limit')
  })

  it('forwards the environment and db-url override to the client', async () => {
    const out = captureStream()
    const { FakeMemoDb, calls } = fakeMemoDb({ result: page([]) })
    const command = new MemoFeed({
      MemoDbClass: FakeMemoDb,
      envUrl: 'https://env.example',
      stdout: out.stream,
      stderr: captureStream().stream
    })

    await command.run({ json: true, dbUrl: 'https://flag.example' })

    assert.equal(calls.opts.envUrl, 'https://env.example')
    assert.equal(calls.opts.dbUrl, 'https://flag.example')
  })
})
