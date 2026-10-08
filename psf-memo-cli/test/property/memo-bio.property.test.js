/*
  Property test for the memo-bio flag validation.

  The 0x6d05 limit counts UTF-8 bytes, not characters: any non-empty bio whose
  UTF-8 byte length is within the limit must be accepted no matter how many
  characters it occupies, and any bio longer than the limit must be rejected.
  Missing and empty bios are always usage errors.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { parseMemoBioFlags, MAX_BIO_BYTES } from '../../src/lib/memo-bio.js'
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

test('the bio limit counts UTF-8 bytes, not characters', () => {
  const rng = seededRandom(20261107)

  for (let i = 0; i < 300; i++) {
    const length = 1 + Math.floor(rng() * (MAX_BIO_BYTES + 40))
    const bio = randomText(rng, length)
    const bytes = Buffer.byteLength(bio, 'utf8')

    let parsed
    let err
    try {
      parsed = parseMemoBioFlags({ memo: bio })
    } catch (e) {
      err = e
    }

    if (bytes <= MAX_BIO_BYTES) {
      assert.equal(err, undefined)
      assert.deepEqual(parsed, { bio })
    } else {
      assert.ok(err instanceof UsageError)
      assert.ok(err.message.includes('too long'))
    }
  }
})

test('the limit is inclusive at 217 bytes for multibyte text', () => {
  for (let length = 106; length <= 110; length++) {
    const bio = 'é'.repeat(length)
    const bytes = Buffer.byteLength(bio, 'utf8')

    if (bytes <= MAX_BIO_BYTES) {
      assert.deepEqual(parseMemoBioFlags({ memo: bio }), { bio })
    } else {
      assert.throws(() => parseMemoBioFlags({ memo: bio }), UsageError)
    }
  }
})

test('a missing or empty bio is always a usage error', () => {
  for (const value of [undefined, null]) {
    assert.throws(
      () => parseMemoBioFlags({ memo: value }),
      (err) => err instanceof UsageError && err.message.includes('-m flag')
    )
  }

  assert.throws(
    () => parseMemoBioFlags({ memo: '' }),
    (err) => err instanceof UsageError && err.message.includes('must not be empty')
  )
})
