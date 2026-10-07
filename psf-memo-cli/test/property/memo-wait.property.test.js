/*
  Property test for the memo-wait polling helper.

  The poll loop makes its first request immediately, then waits `interval`
  milliseconds between requests. A post that appears on poll N is therefore
  reached exactly when `(N-1) * interval <= timeout`; otherwise the loop times
  out. The flag parser accepts exactly positive integers for the timing flags.
  Both are sampled with a seeded generator and an injected clock.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { parseWaitFlags, pollForPost } from '../../src/lib/memo-wait.js'
import { UsageError } from '../../src/lib/reporter.js'

// A clock whose `sleep` records the delay and advances `now`.
function fakeClock () {
  let current = 0
  const delays = []
  return {
    delays,
    now: () => current,
    sleep: async (ms) => {
      delays.push(ms)
      current += ms
    }
  }
}

test('a post on poll N is reached exactly within the timeout budget', async () => {
  const rng = seededRandom(20261017)

  for (let i = 0; i < 200; i++) {
    const appearOn = 1 + Math.floor(rng() * 10)
    const interval = 1 + Math.floor(rng() * 500)
    const timeout = Math.floor(rng() * 10000)
    const reachable = (appearOn - 1) * interval <= timeout

    let calls = 0
    const read = async () => {
      calls++
      return calls >= appearOn ? { text: 'indexed' } : null
    }
    const clock = fakeClock()

    let result
    let err
    try {
      result = await pollForPost({
        read,
        txid: 'post',
        timeout,
        interval,
        sleep: clock.sleep,
        now: clock.now
      })
    } catch (e) {
      err = e
    }

    if (reachable) {
      assert.equal(err, undefined)
      assert.equal(result.polls, appearOn)
      assert.deepEqual(result.post, { text: 'indexed' })
      assert.equal(clock.delays.length, appearOn - 1)
      assert.ok(clock.delays.every((d) => d === interval))
    } else {
      assert.ok(err instanceof Error)
      assert.match(err.message, /^Timed out waiting for post post after \d+ milliseconds\.$/)
      assert.ok(clock.delays.every((d) => d === interval))
    }
  }
})

test('the timing flags accept exactly positive integers and default otherwise', () => {
  const rng = seededRandom(20261018)
  const samples = [undefined, null, '', '0', '-1', 'abc', '1.5', '1', '60000', '250']

  for (let i = 0; i < 200; i++) {
    const raw = samples[Math.floor(rng() * samples.length)]
    const flags = { txid: 'post' }
    if (raw !== undefined) flags.timeout = raw

    const numeric = Number(raw)
    const valid = raw === undefined || raw === null || raw === '' || (Number.isInteger(numeric) && numeric > 0)

    let parsed
    let err
    try {
      parsed = parseWaitFlags(flags)
    } catch (e) {
      err = e
    }

    if (valid) {
      assert.equal(err, undefined)
      assert.equal(parsed.timeout, raw === undefined || raw === null || raw === '' ? 60000 : numeric)
    } else {
      assert.ok(err instanceof UsageError)
    }
  }
})
