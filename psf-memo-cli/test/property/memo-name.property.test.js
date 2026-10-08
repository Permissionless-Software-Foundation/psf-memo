/*
  Property test for the memo-name flag validation.

  The 0x6d01 limit counts UTF-8 bytes, not characters: any non-empty name whose
  UTF-8 byte length is within the limit must be accepted no matter how many
  characters it occupies, and any name longer than the limit must be rejected.
  Missing and empty names are always usage errors.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { parseMemoNameFlags, MAX_NAME_BYTES } from '../../src/lib/memo-name.js'
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

test('the name limit counts UTF-8 bytes, not characters', () => {
  const rng = seededRandom(20261106)

  for (let i = 0; i < 300; i++) {
    const length = 1 + Math.floor(rng() * (MAX_NAME_BYTES + 40))
    const name = randomText(rng, length)
    const bytes = Buffer.byteLength(name, 'utf8')

    let parsed
    let err
    try {
      parsed = parseMemoNameFlags({ memo: name })
    } catch (e) {
      err = e
    }

    if (bytes <= MAX_NAME_BYTES) {
      assert.equal(err, undefined)
      assert.deepEqual(parsed, { name })
    } else {
      assert.ok(err instanceof UsageError)
      assert.ok(err.message.includes('too long'))
    }
  }
})

test('the limit is inclusive at 77 bytes for multibyte text', () => {
  for (let length = 36; length <= 40; length++) {
    const name = 'é'.repeat(length)
    const bytes = Buffer.byteLength(name, 'utf8')

    if (bytes <= MAX_NAME_BYTES) {
      assert.deepEqual(parseMemoNameFlags({ memo: name }), { name })
    } else {
      assert.throws(() => parseMemoNameFlags({ memo: name }), UsageError)
    }
  }
})

test('a missing or empty name is always a usage error', () => {
  for (const value of [undefined, null]) {
    assert.throws(
      () => parseMemoNameFlags({ memo: value }),
      (err) => err instanceof UsageError && err.message.includes('-m flag')
    )
  }

  assert.throws(
    () => parseMemoNameFlags({ memo: '' }),
    (err) => err instanceof UsageError && err.message.includes('must not be empty')
  )
})
