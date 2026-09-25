/*
  Property tests for the TX indexer handoff retry loop.

  The unit tests pin fixed retry fixtures. These properties pin the retry
  invariants across broad random ranges of failures, intervals, and retry
  bounds:

    - Progress: the first request always runs before any sleep, and a
      successful request stops the loop immediately.
    - Accounting: attempts === retries + 1, and one wait is recorded per retry.
    - Ordering: every recorded wait uses the effective interval (per-run
      override when present, otherwise the configured interval).
    - Bound: with `maxRetries`, the loop stops after exactly that many retries.
    - Safety: `startInBackground` resolves instead of rejecting so a failed
      handoff can never stop block indexing.
    - Logging: every failed attempt emits exactly one line naming the endpoint
      and the retry interval.
*/

import test from 'node:test'

import { seededRandom, forAll, intGen } from './harness.js'
import TxIndexerHandoff from '../../src/use-cases/tx-indexer-handoff.js'

const rng = seededRandom(20260925)

// Build a handoff whose start function fails the first `failures` requests and
// succeeds afterwards, recording every start call and requested sleep.
function makeHandoff ({ failures, interval, endpoint, log }) {
  let calls = 0
  const startTxIndexer = async () => {
    calls++
    if (calls <= failures) throw new Error('endpoint down')
    return true
  }
  const sleeps = []
  const handoff = new TxIndexerHandoff({
    startTxIndexer,
    sleep: async (ms) => {
      sleeps.push(ms)
    },
    retryIntervalMs: interval,
    ...(endpoint ? { endpoint } : {}),
    ...(log ? { log } : {})
  })
  return { handoff, sleeps, callCount: () => calls }
}

test('retries exactly until the first success, waiting once per retry', async () => {
  const failuresGen = intGen(rng, 0, 10)
  const intervalGen = intGen(rng, 1, 60000)

  await forAll(
    () => ({ failures: failuresGen(), interval: intervalGen() }),
    async ({ failures, interval }) => {
      const { handoff, sleeps, callCount } = makeHandoff({ failures, interval })

      const result = await handoff.run()

      return (
        result.started === true &&
        result.attempts === failures + 1 &&
        result.retries === failures &&
        result.waits.length === failures &&
        result.waits.every((wait) => wait === interval) &&
        sleeps.length === failures &&
        sleeps.every((wait) => wait === interval) &&
        callCount() === failures + 1
      )
    },
    { label: 'tx handoff retry until success' }
  )
})

test('stops after exactly maxRetries when the endpoint never succeeds', async () => {
  const maxRetriesGen = intGen(rng, 0, 8)
  const intervalGen = intGen(rng, 1, 60000)

  await forAll(
    () => ({ maxRetries: maxRetriesGen(), interval: intervalGen() }),
    async ({ maxRetries, interval }) => {
      const { handoff, sleeps, callCount } = makeHandoff({
        failures: Infinity,
        interval
      })

      const result = await handoff.run({ maxRetries })

      return (
        result.started === false &&
        result.attempts === maxRetries + 1 &&
        result.retries === maxRetries &&
        result.waits.length === maxRetries &&
        result.waits.every((wait) => wait === interval) &&
        sleeps.length === maxRetries &&
        callCount() === maxRetries + 1
      )
    },
    { label: 'tx handoff maxRetries bound' }
  )
})

test('a per-run interval overrides the configured interval for every wait', async () => {
  const failuresGen = intGen(rng, 0, 6)
  const configuredGen = intGen(rng, 1, 60000)
  const overrideGen = intGen(rng, 1, 60000)

  await forAll(
    () => ({
      failures: failuresGen(),
      configured: configuredGen(),
      override: overrideGen()
    }),
    async ({ failures, configured, override }) => {
      const { handoff, sleeps } = makeHandoff({ failures, interval: configured })

      const result = await handoff.run({ retryIntervalMs: override })

      return (
        result.waits.length === failures &&
        result.waits.every((wait) => wait === override) &&
        sleeps.every((wait) => wait === override)
      )
    },
    { label: 'tx handoff per-run interval override' }
  )
})

test('startInBackground resolves instead of rejecting when the endpoint never succeeds', async () => {
  const maxRetriesGen = intGen(rng, 0, 8)
  const intervalGen = intGen(rng, 1, 60000)

  await forAll(
    () => ({ maxRetries: maxRetriesGen(), interval: intervalGen() }),
    async ({ maxRetries, interval }) => {
      const { handoff } = makeHandoff({ failures: Infinity, interval })

      const result = await handoff.startInBackground({ maxRetries })

      return result.started === false && result.retries === maxRetries
    },
    { label: 'tx handoff startInBackground never rejects' }
  )
})

test('logs one failed-attempt line per failure naming the endpoint and retry interval', async () => {
  const failuresGen = intGen(rng, 1, 8)
  const intervalGen = intGen(rng, 1, 60000)
  const portGen = intGen(rng, 1, 65535)

  await forAll(
    () => ({ failures: failuresGen(), interval: intervalGen(), port: portGen() }),
    async ({ failures, interval, port }) => {
      const logs = []
      const { handoff } = makeHandoff({
        failures,
        interval,
        endpoint: () => ({ ip: '10.0.0.7', port }),
        log: (message) => logs.push(message)
      })

      const result = await handoff.run()

      return (
        result.started === true &&
        logs.length === failures &&
        logs.every(
          (message) =>
            message.includes(`IP 10.0.0.7 port ${port}`) &&
            message.includes(`Retrying in ${interval} milliseconds`)
        )
      )
    },
    { label: 'tx handoff failure logging' }
  )
})
