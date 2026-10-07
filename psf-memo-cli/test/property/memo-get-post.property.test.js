/*
  Property tests for the memo-get-post helper and command wiring.

  Unit tests pin a fixed store. These properties exercise broad random posts to
  confirm:

    - summary fidelity: the human summary renders the txid and every stored
      field in the documented shape, and is deterministic for the same post.
    - command fidelity: JSON mode reports the stored post with the request txid
      merged in (the store body is not txid-keyed).
    - not-found: a null post is a failure that names the requested txid.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import MemoGetPost from '../../src/commands/memo-get-post.js'
import { captureStream } from '../support/capture.js'
import { formatGetPostMessage } from '../../src/lib/memo-get-post.js'

const rng = seededRandom(20261016)

const TEXT_ALPHABET = 'abcXYZ09 é中✓:/?&=%@_- '

function randomString (min, max) {
  const length = min + Math.floor(rng() * (max - min + 1))
  let out = ''
  for (let i = 0; i < length; i++) {
    out += TEXT_ALPHABET[Math.floor(rng() * TEXT_ALPHABET.length)]
  }
  return out
}

// A 64-character hex string, the shape of a real txid.
function randomTxid () {
  const hex = '0123456789abcdef'
  let out = ''
  for (let i = 0; i < 64; i++) {
    out += hex[Math.floor(rng() * hex.length)]
  }
  return out
}

// A stored /level/post body: the key txid is deliberately absent, matching the
// service response the command reads.
function randomStoredPost () {
  return {
    addr: randomString(5, 40),
    text: randomString(1, 60),
    blockHeight: Math.floor(rng() * 1e7),
    seen: Math.floor(rng() * 1e6)
  }
}

test('formatGetPostMessage renders the txid and stored fields in the documented shape', () => {
  for (let i = 0; i < 300; i++) {
    const post = { txid: randomTxid(), ...randomStoredPost() }

    const message = formatGetPostMessage(post)

    assert.equal(
      message,
      `${post.txid}: ${post.text} (${post.addr}, block ${post.blockHeight}, seen ${post.seen})`
    )
    assert.equal(message, formatGetPostMessage(post))
  }
})

test('memo-get-post JSON mode merges the request txid into the stored post', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 120; i++) {
      const stored = randomStoredPost()
      const txid = randomTxid()

      class FakeMemoDb {
        async getPost () {
          return { ...stored }
        }
      }

      const out = captureStream()
      const command = new MemoGetPost({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: out.stream,
        stderr: captureStream().stream
      })

      const code = await command.run({ json: true, txid })

      assert.equal(code, 0)
      const reported = { txid, ...stored }
      assert.deepEqual(JSON.parse(out.text()), {
        message: formatGetPostMessage(reported),
        post: reported
      })
    }
  } finally {
    process.exitCode = originalExitCode
  }
})

test('memo-get-post reports a null post as a not-found failure naming the txid', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 100; i++) {
      const txid = randomTxid()

      class FakeMemoDb {
        async getPost () {
          return null
        }
      }

      const err = captureStream()
      const command = new MemoGetPost({
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
