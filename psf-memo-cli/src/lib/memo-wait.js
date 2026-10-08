/*
  Pure helper for the memo-wait read command.

  The command polls GET /level/post/:txid until the post is indexed or the
  timeout budget elapses. This module owns the timing flag validation and the
  poll loop, both injectable so tests never wait on real time; the command is a
  thin wiring layer over the shared reporter and the read-only Memo DB client.
*/

// Local libraries
import { UsageError } from './reporter.js'
import { parseTxidFlag } from './txid-flag.js'

// The default total wait budget and poll interval, in milliseconds.
export const DEFAULT_WAIT_TIMEOUT_MS = 60000
export const DEFAULT_WAIT_INTERVAL_MS = 5000

// Parse a positive-integer millisecond flag, falling back when it is absent. A
// bad value is a usage error so the caller exits 2 and names the exact flag.
function parsePositiveInteger (value, fallback, flag) {
  if (value === undefined || value === null || value === '') return fallback

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new UsageError(`The ${flag} value must be a positive integer number of milliseconds.`)
  }
  return parsed
}

// Resolve the required post txid and the wait timing. Throws a UsageError (exit
// 2) for a missing txid or a non-positive/non-integer timing flag.
export function parseWaitFlags (flags = {}) {
  const { txid } = parseTxidFlag(flags)

  return {
    txid,
    timeout: parsePositiveInteger(flags.timeout, DEFAULT_WAIT_TIMEOUT_MS, '--timeout'),
    interval: parsePositiveInteger(flags.interval, DEFAULT_WAIT_INTERVAL_MS, '--interval')
  }
}

// Poll `read` immediately, then every `interval` ms, until it resolves a post or
// the `timeout` budget is exhausted. Returns { post, polls }; throws a timeout
// error otherwise. A rejected `read` propagates immediately without retrying.
export async function pollForPost ({ read, txid, timeout, interval, sleep, now }) {
  const start = now()
  let polls = 0

  while (true) {
    const post = await read()
    polls++

    if (post) return { post, polls }

    if (now() - start + interval > timeout) {
      throw new Error(`Timed out waiting for post ${txid} after ${timeout} milliseconds.`)
    }

    await sleep(interval)
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:56:49.509Z","module_hash":"a320e6f5eec1a7cab9e0ee374b673c5008dadfb1b00a298fa3e1fcde2c53a47b","functions":[{"id":"func/parsePositiveInteger","name":"parsePositiveInteger","line":20,"end_line":28,"hash":"49ac38c7fd72c5561ad40d0b9c56a5799b7656bcccda6d5a8243c618232ba7f8"},{"id":"func/parseWaitFlags","name":"parseWaitFlags","line":32,"end_line":40,"hash":"23afc816b4749e23485abb0a983a16f5980de677a95d8bf831ddc68d5afb420a"},{"id":"func/pollForPost","name":"pollForPost","line":45,"end_line":61,"hash":"bcb413f32d92cf3720ec4678237c1fab2d08da8b5dc46b79406ffc5d3773c74d"}]}
// mutate4javascript-manifest-end
