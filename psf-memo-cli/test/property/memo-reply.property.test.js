/*
  Property test for the memo-reply flag validation.

  The 0x6d03 reply limit counts UTF-8 bytes, not characters: any non-empty reply
  whose byte length is within the limit must be accepted regardless of character
  count, and any reply over the limit must be rejected. The parent txid must be
  encoded to its little-endian wire bytes. Both are sampled with a seeded
  generator.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { parseReplyFlags, MAX_REPLY_BYTES } from '../../src/lib/memo-reply.js'
import { UsageError } from '../../src/lib/reporter.js'

// A deterministic multibyte alphabet: ASCII, 2-byte, and 3-byte characters.
const ALPHABET = ['a', 'b', 'c', 'é', 'ü', '中']

// A valid-looking 64-char hex txid sampled from a seeded rng.
function randomTxid (rng) {
  let txid = ''
  for (let i = 0; i < 64; i++) {
    txid += '0123456789abcdef'[Math.floor(rng() * 16)]
  }
  return txid
}

function randomText (rng, length) {
  let text = ''
  for (let i = 0; i < length; i++) {
    text += ALPHABET[Math.floor(rng() * ALPHABET.length)]
  }
  return text
}

test('the reply limit counts UTF-8 bytes, not characters', () => {
  const rng = seededRandom(20261014)

  for (let i = 0; i < 200; i++) {
    const length = 1 + Math.floor(rng() * 120)
    const text = randomText(rng, length)
    const txid = randomTxid(rng)

    let parsed
    let err
    try {
      parsed = parseReplyFlags({ txid, memo: text })
    } catch (e) {
      err = e
    }

    if (Buffer.byteLength(text, 'utf8') <= MAX_REPLY_BYTES) {
      assert.equal(err, undefined)
      assert.equal(parsed.text, text)
      assert.equal(parsed.parentBytes.toString('hex'), Buffer.from(txid, 'hex').reverse().toString('hex'))
    } else {
      assert.ok(err instanceof UsageError)
    }
  }
})

test('the byte limit is inclusive at 184 bytes for multibyte text', () => {
  const txid = 'a'.repeat(64)
  for (let length = MAX_REPLY_BYTES / 2 - 1; length <= MAX_REPLY_BYTES / 2 + 1; length++) {
    const text = 'é'.repeat(length)
    if (Buffer.byteLength(text, 'utf8') <= MAX_REPLY_BYTES) {
      assert.equal(parseReplyFlags({ txid, memo: text }).text, text)
    } else {
      assert.throws(() => parseReplyFlags({ txid, memo: text }), UsageError)
    }
  }
})
