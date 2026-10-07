/*
  Unit tests for the memo-status read command.

  These drive the real command against an injected MemoDb class so the reported
  sync heights, the missing-status failure, the endpoint override, and the
  transport error are pinned without a network.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoStatus from '../../../src/commands/memo-status.js'
import { captureStream } from '../../support/capture.js'

const STATUS = {
  startBlockHeight: 524999,
  syncedBlockHeight: 800000,
  chainBlockHeight: 800001
}

// Build a MemoDb stand-in that records its constructor options and resolves the
// supplied status or error from getStatus.
function fakeMemoDb ({ result, error } = {}) {
  const calls = { opts: null, called: 0 }
  class FakeMemoDb {
    constructor (opts) {
      calls.opts = opts
    }

    async getStatus () {
      calls.called++
      if (error) throw error
      return result
    }
  }
  return { FakeMemoDb, calls }
}

describe('#memo-status command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('reports the indexer sync heights as JSON', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb, calls } = fakeMemoDb({ result: STATUS })
    const command = new MemoStatus({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true })

    assert.equal(code, 0)
    assert.equal(calls.called, 1)
    assert.deepEqual(JSON.parse(out.text()).status, STATUS)
    assert.equal(err.text(), '')
  })

  it('reports a missing status as not found (exit 1)', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb } = fakeMemoDb({ result: null })
    const command = new MemoStatus({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true })

    assert.equal(code, 1)
    assert.equal(out.text(), '')
    assert.include(JSON.parse(err.text()).error.toLowerCase(), 'not found')
  })

  it('reports a failed status request on stderr with exit 1', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb } = fakeMemoDb({ error: new Error('Memo DB request failed with HTTP 500') })
    const command = new MemoStatus({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'Memo DB request failed with HTTP 500')
  })

  it('forwards the environment and db-url override to the client', async () => {
    const out = captureStream()
    const { FakeMemoDb, calls } = fakeMemoDb({ result: STATUS })
    const command = new MemoStatus({
      MemoDbClass: FakeMemoDb,
      envUrl: 'https://env.example',
      stdout: out.stream,
      stderr: captureStream().stream
    })

    await command.run({ json: true, dbUrl: 'https://flag.example' })

    assert.equal(calls.opts.envUrl, 'https://env.example')
    assert.equal(calls.opts.dbUrl, 'https://flag.example')
  })

  it('accepts the optional flags with no required values', () => {
    const command = new MemoStatus()

    assert.equal(command.validateFlags({}), true)
  })
})
