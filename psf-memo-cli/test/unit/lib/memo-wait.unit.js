/*
  Unit tests for the pure memo-wait helper.

  The command polls GET /level/post/:txid until the post is indexed or the
  timeout budget elapses. These pin the flag parsing (positive-integer
  timeout/interval), the immediate-first-poll and interval-polling behavior, and
  the timeout error, using an injected clock so no real time passes.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  parseWaitFlags,
  pollForPost,
  DEFAULT_WAIT_TIMEOUT_MS,
  DEFAULT_WAIT_INTERVAL_MS
} from '../../../src/lib/memo-wait.js'
import { UsageError } from '../../../src/lib/reporter.js'
import { fakeClock } from '../../support/clock.js'

const TIMEOUT_ERROR =
  'The --timeout value must be a positive integer number of milliseconds.'
const INTERVAL_ERROR =
  'The --interval value must be a positive integer number of milliseconds.'

// A read function that resolves null until the post is available on call `onCall`.
function readOnCall (post, onCall) {
  let calls = 0
  return async () => {
    calls++
    return calls >= onCall ? post : null
  }
}

function captureUsageError (fn) {
  try {
    fn()
  } catch (err) {
    assert.instanceOf(err, UsageError)
    return err
  }
  throw new Error('Expected a UsageError')
}

describe('#memo-wait helpers', () => {
  it('exposes the default timeout and interval', () => {
    assert.equal(DEFAULT_WAIT_TIMEOUT_MS, 60000)
    assert.equal(DEFAULT_WAIT_INTERVAL_MS, 5000)
  })

  it('parses the required txid with default timing', () => {
    assert.deepEqual(parseWaitFlags({ txid: 'post-abc' }), {
      txid: 'post-abc',
      timeout: DEFAULT_WAIT_TIMEOUT_MS,
      interval: DEFAULT_WAIT_INTERVAL_MS
    })
  })

  it('parses explicit positive-integer timing', () => {
    assert.deepEqual(parseWaitFlags({ txid: 'post-abc', timeout: '3000', interval: '1000' }), {
      txid: 'post-abc',
      timeout: 3000,
      interval: 1000
    })
  })

  it('treats null or empty timing flags as absent', () => {
    assert.deepEqual(parseWaitFlags({ txid: 'post-abc', timeout: null, interval: '' }), {
      txid: 'post-abc',
      timeout: DEFAULT_WAIT_TIMEOUT_MS,
      interval: DEFAULT_WAIT_INTERVAL_MS
    })
  })

  it('rejects a missing txid', () => {
    const err = captureUsageError(() => parseWaitFlags({}))
    assert.equal(err.message, 'You must specify a post txid with the -t flag.')
  })

  it('rejects a non-positive or non-integer timeout or interval', () => {
    const cases = [
      ['timeout', TIMEOUT_ERROR],
      ['interval', INTERVAL_ERROR]
    ]

    for (const [flag, expected] of cases) {
      for (const value of ['0', '-1', 'abc', '1.5']) {
        const err = captureUsageError(() => parseWaitFlags({ txid: 'post-abc', [flag]: value }))
        assert.equal(err.message, expected)
      }
    }
  })

  it('returns an already-indexed post without waiting', async () => {
    const clock = fakeClock()
    const result = await pollForPost({
      read: async () => ({ text: 'hello memo' }),
      txid: 'post-abc',
      timeout: 60000,
      interval: 5000,
      sleep: clock.sleep,
      now: clock.now
    })

    assert.equal(result.polls, 1)
    assert.deepEqual(result.post, { text: 'hello memo' })
    assert.deepEqual(clock.delays, [])
  })

  it('polls at the interval until the post is indexed', async () => {
    const cases = [
      { onCall: 3, text: 'waited memo', timeout: 60000, interval: 5000, delays: [5000, 5000] },
      { onCall: 4, text: 'edge memo', timeout: 3000, interval: 1000, delays: [1000, 1000, 1000] }
    ]

    for (const { onCall, text, timeout, interval, delays } of cases) {
      const clock = fakeClock()
      const result = await pollForPost({
        read: readOnCall({ text }, onCall),
        txid: 'post',
        timeout,
        interval,
        sleep: clock.sleep,
        now: clock.now
      })

      assert.equal(result.polls, onCall)
      assert.deepEqual(result.post, { text })
      assert.deepEqual(clock.delays, delays)
    }
  })

  it('times out with the post and budget in the message', async () => {
    const clock = fakeClock()
    let err
    try {
      await pollForPost({
        read: async () => null,
        txid: 'post-missing',
        timeout: 3000,
        interval: 1000,
        sleep: clock.sleep,
        now: clock.now
      })
    } catch (e) {
      err = e
    }

    assert.instanceOf(err, Error)
    assert.notInstanceOf(err, UsageError)
    assert.equal(err.message, 'Timed out waiting for post post-missing after 3000 milliseconds.')
    assert.deepEqual(clock.delays, [1000, 1000, 1000])
  })

  it('propagates a read failure without retrying', async () => {
    const clock = fakeClock()
    let calls = 0
    let err
    try {
      await pollForPost({
        read: async () => {
          calls++
          throw new Error('fetch failed')
        },
        txid: 'post-abc',
        timeout: 3000,
        interval: 1000,
        sleep: clock.sleep,
        now: clock.now
      })
    } catch (e) {
      err = e
    }

    assert.equal(err.message, 'fetch failed')
    assert.equal(calls, 1)
    assert.deepEqual(clock.delays, [])
  })
})
