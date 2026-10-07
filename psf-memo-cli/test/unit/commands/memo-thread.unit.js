/*
  Unit tests for the memo-thread read command.

  These drive the real command against an injected MemoDb class so the required
  txid, the thread passthrough, the not-found failure, the endpoint override,
  and the usage/transport reporting are pinned without a network.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoThread from '../../../src/commands/memo-thread.js'
import { captureStream } from '../../support/capture.js'

const THREAD = {
  post: {
    txid: 'thread-root',
    text: 'the root',
    replyCount: 1,
    likeCount: 2,
    replies: [
      { txid: 'thread-reply-1', text: 'r1', replyCount: 0, likeCount: 1, replies: [] }
    ]
  }
}

// Build a MemoDb stand-in that records its constructor options and the
// getThread txid, and resolves the supplied thread or error.
function fakeMemoDb ({ result, error } = {}) {
  const calls = { opts: null, txid: null }
  class FakeMemoDb {
    constructor (opts) {
      calls.opts = opts
    }

    async getThread (txid) {
      calls.txid = txid
      if (error) throw error
      return result
    }
  }
  return { FakeMemoDb, calls }
}

describe('#memo-thread command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('reads the thread and reports the post tree as JSON', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb, calls } = fakeMemoDb({ result: THREAD })
    const command = new MemoThread({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true, txid: 'thread-root' })

    assert.equal(code, 0)
    assert.equal(calls.txid, 'thread-root')
    const payload = JSON.parse(out.text())
    assert.equal(payload.post.txid, 'thread-root')
    assert.equal(payload.post.likeCount, 2)
    assert.equal(payload.post.replies[0].txid, 'thread-reply-1')
    assert.equal(err.text(), '')
  })

  it('reports a missing txid as the documented usage error (exit 2)', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb } = fakeMemoDb()
    const command = new MemoThread({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), {
      error: 'You must specify a post txid with the -t flag.'
    })
  })

  it('reports an unindexed txid as not found (exit 1)', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb } = fakeMemoDb({ result: null })
    const command = new MemoThread({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true, txid: 'thread-missing' })

    assert.equal(code, 1)
    assert.equal(out.text(), '')
    assert.include(JSON.parse(err.text()).error.toLowerCase(), 'not found')
  })

  it('reports a failed thread request on stderr with exit 1', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb } = fakeMemoDb({ error: new Error('Memo DB request failed with HTTP 500') })
    const command = new MemoThread({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true, txid: 'thread-root' })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'Memo DB request failed with HTTP 500')
  })

  it('forwards the environment and db-url override to the client', async () => {
    const out = captureStream()
    const { FakeMemoDb, calls } = fakeMemoDb({ result: THREAD })
    const command = new MemoThread({
      MemoDbClass: FakeMemoDb,
      envUrl: 'https://env.example',
      stdout: out.stream,
      stderr: captureStream().stream
    })

    await command.run({ json: true, txid: 'thread-root', dbUrl: 'https://flag.example' })

    assert.equal(calls.opts.envUrl, 'https://env.example')
    assert.equal(calls.opts.dbUrl, 'https://flag.example')
  })
})
