/*
  Unit tests for the memo-wait read command.

  These drive the real command against an injected MemoDb class and clock so
  the required txid, the immediate and interval polling, the indexed-post
  report, the timeout, the no-retry transport failure, and the usage/endpoint
  reporting are pinned without a network or real waiting.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoWait from '../../../src/commands/memo-wait.js'
import { captureStream } from '../../support/capture.js'
import { fakeClock } from '../../support/clock.js'

const STORED_POST = {
  addr: 'bitcoincash:qaddr-a',
  text: 'hello memo',
  blockHeight: 600001,
  seen: 1000
}

// Build a MemoDb stand-in that records its options and returns the supplied
// sequence of posts (null = not yet indexed) or throws the supplied error.
function fakeMemoDb ({ results, error } = {}) {
  const calls = { opts: null, count: 0 }
  class FakeMemoDb {
    constructor (opts) {
      calls.opts = opts
    }

    async getPost () {
      calls.count++
      if (error) throw error
      if (Array.isArray(results)) {
        return results[Math.min(calls.count - 1, results.length - 1)]
      }
      return results
    }
  }
  return { FakeMemoDb, calls }
}

function makeCommand ({ FakeMemoDb, clock }) {
  const out = captureStream()
  const err = captureStream()
  const command = new MemoWait({
    MemoDbClass: FakeMemoDb,
    envUrl: null,
    sleep: clock.sleep,
    now: clock.now,
    stdout: out.stream,
    stderr: err.stream
  })
  return { command, out, err }
}

describe('#memo-wait command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('reports an already-indexed post as JSON without waiting', async () => {
    const clock = fakeClock()
    const { FakeMemoDb, calls } = fakeMemoDb({ results: [STORED_POST] })
    const { command, out, err } = makeCommand({ FakeMemoDb, clock })

    const code = await command.run({ json: true, txid: 'post-abc' })

    assert.equal(code, 0)
    assert.equal(calls.count, 1)
    assert.deepEqual(clock.delays, [])
    assert.deepEqual(JSON.parse(out.text()).post, { ...STORED_POST, txid: 'post-abc' })
    assert.equal(err.text(), '')
  })

  it('polls at the default interval until the post is indexed', async () => {
    const clock = fakeClock()
    const { FakeMemoDb, calls } = fakeMemoDb({ results: [null, null, STORED_POST] })
    const { command, out } = makeCommand({ FakeMemoDb, clock })

    const code = await command.run({ json: true, txid: 'wait-post' })

    assert.equal(code, 0)
    assert.equal(calls.count, 3)
    assert.deepEqual(clock.delays, [5000, 5000])
    assert.equal(JSON.parse(out.text()).post.txid, 'wait-post')
  })

  it('gives up at the timeout and reports a timeout error (exit 1)', async () => {
    const clock = fakeClock()
    const { FakeMemoDb } = fakeMemoDb({ results: null })
    const { command, out, err } = makeCommand({ FakeMemoDb, clock })

    const code = await command.run({ json: true, txid: 'post-missing', timeout: '3000', interval: '1000' })

    assert.equal(code, 1)
    assert.equal(out.text(), '')
    assert.deepEqual(JSON.parse(err.text()), {
      error: 'Timed out waiting for post post-missing after 3000 milliseconds.'
    })
  })

  it('reports a failed request as an error without retrying (exit 1)', async () => {
    const clock = fakeClock()
    const { FakeMemoDb, calls } = fakeMemoDb({ error: new Error('fetch failed') })
    const { command, err } = makeCommand({ FakeMemoDb, clock })

    const code = await command.run({ json: true, txid: 'post-abc', timeout: '3000', interval: '1000' })

    assert.equal(code, 1)
    assert.equal(calls.count, 1)
    assert.deepEqual(clock.delays, [])
    assert.deepEqual(JSON.parse(err.text()), { error: 'fetch failed' })
  })

  it('reports a missing txid as the documented usage error (exit 2)', async () => {
    const clock = fakeClock()
    const { FakeMemoDb } = fakeMemoDb()
    const { command, err } = makeCommand({ FakeMemoDb, clock })

    const code = await command.run({ json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), {
      error: 'You must specify a post txid with the -t flag.'
    })
  })

  it('reports an invalid timeout or interval as a usage error (exit 2)', async () => {
    const cases = [
      [{ txid: 'post-abc', timeout: '0' }, 'The --timeout value must be a positive integer number of milliseconds.'],
      [{ txid: 'post-abc', timeout: 'abc' }, 'The --timeout value must be a positive integer number of milliseconds.'],
      [{ txid: 'post-abc', interval: '0' }, 'The --interval value must be a positive integer number of milliseconds.'],
      [{ txid: 'post-abc', interval: 'abc' }, 'The --interval value must be a positive integer number of milliseconds.']
    ]

    for (const [flags, expected] of cases) {
      const clock = fakeClock()
      const { FakeMemoDb } = fakeMemoDb()
      const { command, err } = makeCommand({ FakeMemoDb, clock })

      const code = await command.run({ json: true, ...flags })

      assert.equal(code, 2)
      assert.deepEqual(JSON.parse(err.text()), { error: expected })
    }
  })

  it('forwards the environment and db-url override to the client', async () => {
    const clock = fakeClock()
    const { FakeMemoDb, calls } = fakeMemoDb({ results: [STORED_POST] })
    const out = captureStream()
    const command = new MemoWait({
      MemoDbClass: FakeMemoDb,
      envUrl: 'https://env.example',
      sleep: clock.sleep,
      now: clock.now,
      stdout: out.stream,
      stderr: captureStream().stream
    })

    await command.run({ json: true, txid: 'post-abc', dbUrl: 'https://flag.example' })

    assert.equal(calls.opts.envUrl, 'https://env.example')
    assert.equal(calls.opts.dbUrl, 'https://flag.example')
  })

  it('resolves the txid and timing flags without polling', () => {
    const command = new MemoWait({ MemoDbClass: fakeMemoDb().FakeMemoDb })

    assert.deepEqual(command.validateFlags({ txid: 'post-abc', timeout: '1000', interval: '250' }), {
      txid: 'post-abc',
      timeout: 1000,
      interval: 250
    })
  })

  it('falls back to the real clock when no clock is injected', async () => {
    const { FakeMemoDb, calls } = fakeMemoDb({ results: [null, STORED_POST] })
    const out = captureStream()
    const command = new MemoWait({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      stdout: out.stream,
      stderr: captureStream().stream
    })

    const code = await command.run({ json: true, txid: 'real-clock-post', interval: '1' })

    assert.equal(code, 0)
    assert.equal(calls.count, 2)
    assert.equal(JSON.parse(out.text()).post.txid, 'real-clock-post')
  })
})
