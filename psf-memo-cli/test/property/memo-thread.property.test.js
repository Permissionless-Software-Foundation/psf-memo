/*
  Property tests for the memo-thread read-command helpers and command wiring.

  Unit tests pin a fixed thread. These properties exercise broad random trees to
  confirm:

    - required-txid identity: any non-empty txid is preserved verbatim, while a
      missing or empty txid is the documented UsageError.
    - tree rendering: the summary renders every node in pre-order, at two
      spaces of indentation per depth, with each node's text and counts.
    - command fidelity: JSON mode reports the service thread's post unchanged,
      and a null thread is a not-found failure that names the requested txid.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import MemoThread from '../../src/commands/memo-thread.js'
import { captureStream } from '../support/capture.js'
import { parseThreadFlags, formatThreadMessage } from '../../src/lib/memo-thread.js'
import { UsageError } from '../../src/lib/reporter.js'

const rng = seededRandom(20261015)

const TXID_ALPHABET = '0123456789abcdef'

function randomTxid () {
  let out = ''
  for (let i = 0; i < 64; i++) {
    out += TXID_ALPHABET[Math.floor(rng() * TXID_ALPHABET.length)]
  }
  return out
}

// Build a bounded random reply tree with unique txids. `counter` is shared so
// every node in one tree gets a distinct id.
function randomNode (counter, depth) {
  const id = counter.value++
  const replies = []
  if (depth < 3 && rng() < 0.6) {
    const children = 1 + Math.floor(rng() * 3)
    for (let i = 0; i < children; i++) {
      replies.push(randomNode(counter, depth + 1))
    }
  }
  return {
    txid: `node-${id}`,
    text: `text ${id}`,
    replyCount: replies.length,
    likeCount: Math.floor(rng() * 6),
    replies
  }
}

// Flatten a tree in the same pre-order the formatter uses, tagging each node
// with its depth so the expected line can be built exactly.
function flatten (node, depth = 0, out = []) {
  out.push({ node, depth })
  for (const reply of node.replies) {
    flatten(reply, depth + 1, out)
  }
  return out
}

test('parseThreadFlags preserves any non-empty txid and rejects a missing one', () => {
  for (let i = 0; i < 300; i++) {
    const txid = randomTxid()
    assert.deepEqual(parseThreadFlags({ txid }), { txid })
  }

  for (const missing of [{}, { txid: '' }, { txid: undefined }, { txid: null }]) {
    assert.throws(
      () => parseThreadFlags(missing),
      (err) => err instanceof UsageError && err.message === 'You must specify a post txid with the -t flag.',
      `should reject ${JSON.stringify(missing)}`
    )
  }
})

test('formatThreadMessage renders every node in pre-order at two spaces per depth', () => {
  for (let i = 0; i < 200; i++) {
    const root = randomNode({ value: 0 }, 0)

    const lines = formatThreadMessage(root).split('\n')
    const expected = flatten(root)

    assert.equal(lines.length, expected.length)
    expected.forEach(({ node, depth }, index) => {
      assert.equal(
        lines[index],
        `${'  '.repeat(depth)}${node.txid}: ${node.text} (replies ${node.replyCount}, likes ${node.likeCount})`
      )
    })
  }
})

test('formatThreadMessage is deterministic for the same tree', () => {
  for (let i = 0; i < 100; i++) {
    const root = randomNode({ value: 0 }, 0)
    assert.equal(formatThreadMessage(root), formatThreadMessage(root))
  }
})

test('memo-thread JSON mode reports the service thread post verbatim', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 120; i++) {
      const post = randomNode({ value: 0 }, 0)

      class FakeMemoDb {
        async getThread () {
          return { post }
        }
      }

      const out = captureStream()
      const command = new MemoThread({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: out.stream,
        stderr: captureStream().stream
      })

      const code = await command.run({ json: true, txid: post.txid })

      assert.equal(code, 0)
      assert.deepEqual(JSON.parse(out.text()), {
        message: formatThreadMessage(post),
        post
      })
    }
  } finally {
    process.exitCode = originalExitCode
  }
})

test('memo-thread reports a null thread as a not-found failure naming the txid', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 100; i++) {
      const txid = randomTxid()

      class FakeMemoDb {
        async getThread () {
          return null
        }
      }

      const err = captureStream()
      const command = new MemoThread({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: captureStream().stream,
        stderr: err.stream
      })

      const code = await command.run({ json: true, txid })

      assert.equal(code, 1)
      const error = JSON.parse(err.text()).error
      assert.ok(error.toLowerCase().includes('not found'))
      assert.ok(error.includes(txid))
    }
  } finally {
    process.exitCode = originalExitCode
  }
})
