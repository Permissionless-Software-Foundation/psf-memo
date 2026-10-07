/*
  Property test for the memo-post flag validation.

  The 0x6d02 limit counts UTF-16 code units, not UTF-8 bytes: any non-empty text
  whose character length is within the limit must be accepted no matter how many
  bytes it occupies, and any text longer than the limit must be rejected. This
  samples multibyte strings across the boundary with a seeded generator.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { parseMemoPostFlags, MAX_MEMO_CHARS } from '../../src/lib/memo-post.js'
import { UsageError } from '../../src/lib/reporter.js'

// A deterministic multibyte alphabet: ASCII, 2-byte, and 3-byte characters.
const ALPHABET = ['a', 'b', 'c', 'é', 'ü', '中']

function randomText (rng, length) {
  let text = ''
  for (let i = 0; i < length; i++) {
    text += ALPHABET[Math.floor(rng() * ALPHABET.length)]
  }
  return text
}

test('the post limit counts characters, not bytes', () => {
  const rng = seededRandom(20261013)

  for (let i = 0; i < 200; i++) {
    const length = 1 + Math.floor(rng() * (MAX_MEMO_CHARS + 80))
    const text = randomText(rng, length)

    let parsed
    let err
    try {
      parsed = parseMemoPostFlags({ memo: text })
    } catch (e) {
      err = e
    }

    if (text.length <= MAX_MEMO_CHARS) {
      assert.equal(err, undefined)
      assert.deepEqual(parsed, { memo: text })
    } else {
      assert.ok(err instanceof UsageError)
    }
  }
})

test('the limit is inclusive at 217 characters for multibyte text', () => {
  for (let length = MAX_MEMO_CHARS - 2; length <= MAX_MEMO_CHARS + 2; length++) {
    const text = 'é'.repeat(length)
    if (length <= MAX_MEMO_CHARS) {
      assert.deepEqual(parseMemoPostFlags({ memo: text }), { memo: text })
    } else {
      assert.throws(() => parseMemoPostFlags({ memo: text }), UsageError)
    }
  }
})
