/*
  Unit tests for the memo-get-post read command.

  These drive the real command against an injected MemoDb class so the required
  txid, the stored post fields (with the request txid merged in), the not-found
  failure, the endpoint override, and the usage/transport reporting are pinned
  without a network.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoGetPost from '../../../src/commands/memo-get-post.js'
import { captureStream } from '../../support/capture.js'

// The stored post as psf-memo-db returns it: the key txid is not in the body.
const STORED_POST = {
  addr: 'bitcoincash:qaddr-a',
  text: 'hello memo',
  blockHeight: 600001,
  seen: 1000
}

// Build a MemoDb stand-in that records its constructor options and the getPost
// txid, and resolves the supplied post or error.
function fakeMemoDb ({ result, error } = {}) {
  const calls = { opts: null, txid: null }
  class FakeMemoDb {
    constructor (opts) {
      calls.opts = opts
    }

    async getPost (txid) {
      calls.txid = txid
      if (error) throw error
      return result
    }
  }
  return { FakeMemoDb, calls }
}

describe('#memo-get-post command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('reads the stored post and reports it with the request txid as JSON', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb, calls } = fakeMemoDb({ result: STORED_POST })
    const command = new MemoGetPost({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true, txid: 'post-abc' })

    assert.equal(code, 0)
    assert.equal(calls.txid, 'post-abc')
    const payload = JSON.parse(out.text())
    assert.deepEqual(payload.post, { ...STORED_POST, txid: 'post-abc' })
    assert.equal(err.text(), '')
  })

  it('reports a missing txid as the documented usage error (exit 2)', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb } = fakeMemoDb()
    const command = new MemoGetPost({
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

  it('reports a txid with no stored post as not found (exit 1)', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb } = fakeMemoDb({ result: null })
    const command = new MemoGetPost({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true, txid: 'post-missing' })

    assert.equal(code, 1)
    assert.equal(out.text(), '')
    assert.include(JSON.parse(err.text()).error.toLowerCase(), 'not found')
  })

  it('reports a failed post request on stderr with exit 1', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb } = fakeMemoDb({ error: new Error('Memo DB request failed with HTTP 500') })
    const command = new MemoGetPost({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true, txid: 'post-abc' })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'Memo DB request failed with HTTP 500')
  })

  it('forwards the environment and db-url override to the client', async () => {
    const out = captureStream()
    const { FakeMemoDb, calls } = fakeMemoDb({ result: STORED_POST })
    const command = new MemoGetPost({
      MemoDbClass: FakeMemoDb,
      envUrl: 'https://env.example',
      stdout: out.stream,
      stderr: captureStream().stream
    })

    await command.run({ json: true, txid: 'post-abc', dbUrl: 'https://flag.example' })

    assert.equal(calls.opts.envUrl, 'https://env.example')
    assert.equal(calls.opts.dbUrl, 'https://flag.example')
  })
})
