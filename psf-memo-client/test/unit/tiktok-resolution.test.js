/*
  Unit tests for the TikTok short-link resolution orchestration.

  The React effect cannot run under server rendering, so the effect's logic is
  extracted into `resolveShortLinks` and pinned here: each unattempted link is
  requested once, falsy ids are ignored, a cancel suppresses later callbacks,
  and resolver rejections are swallowed so the UI falls back to a plain link.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { resolveShortLinks } = require('../../src/components/post-feed/post-content')

// Let pending promise callbacks run.
function flush () {
  return new Promise((resolve) => setImmediate(resolve))
}

test('resolveShortLinks resolves each unattempted link once', async () => {
  const attempted = new Set()
  const resolved = []
  resolveShortLinks(['a', 'b'], attempted, async (url) => `id-${url}`, (url, id) => {
    resolved.push([url, id])
  })

  await flush()

  assert.deepEqual(resolved.slice().sort(), [['a', 'id-a'], ['b', 'id-b']])
  assert.deepEqual([...attempted].sort(), ['a', 'b'])
})

test('resolveShortLinks skips links already attempted', async () => {
  const attempted = new Set(['a'])
  const resolved = []
  resolveShortLinks(['a', 'b'], attempted, async () => 'id', (url, id) => {
    resolved.push([url, id])
  })

  await flush()

  assert.deepEqual(resolved, [['b', 'id']])
})

test('resolveShortLinks ignores a falsy video id', async () => {
  const attempted = new Set()
  const resolved = []
  resolveShortLinks(['a', 'b'], attempted, async (url) => (url === 'a' ? null : 'id-b'), (url, id) => {
    resolved.push([url, id])
  })

  await flush()

  assert.deepEqual(resolved, [['b', 'id-b']])
})

test('resolveShortLinks suppresses callbacks after cancel', async () => {
  const attempted = new Set()
  const resolved = []
  let release
  const pending = new Promise((resolve) => { release = resolve })
  const cancel = resolveShortLinks(['a'], attempted, () => pending, (url, id) => {
    resolved.push([url, id])
  })

  cancel()
  release('id-a')
  await flush()

  assert.deepEqual(resolved, [])
})

test('resolveShortLinks is a no-op when no resolver is supplied', async () => {
  const attempted = new Set()
  const resolved = []
  const cancel = resolveShortLinks(['a'], attempted, undefined, (url, id) => {
    resolved.push([url, id])
  })

  await flush()

  assert.deepEqual(resolved, [])
  assert.deepEqual([...attempted], [])
  assert.equal(typeof cancel, 'function')
  cancel()
})

test('resolveShortLinks swallows resolver rejections', async () => {
  const attempted = new Set()
  const resolved = []
  resolveShortLinks(['a'], attempted, async () => { throw new Error('nope') }, (url, id) => {
    resolved.push([url, id])
  })

  await flush()

  assert.deepEqual(resolved, [])
})
