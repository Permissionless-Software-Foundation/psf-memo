/*
  Shared property tests for the memo-text -m byte-limit parsers.

  memo-name and memo-bio both measure their text in UTF-8 bytes against an
  inclusive limit, so the byte-count property is asserted once here for each
  command's parser and limit.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
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

// Register the shared UTF-8 byte-limit property tests for one parser. `flag`
// names the source flag property (default `-m`); `missingHint` is the flag
// string the missing-value message must name.
export function registerMemoTextByteLimitTests ({
  name,
  parse,
  field,
  limit,
  seed,
  flag = 'memo',
  missingHint = '-m flag'
}) {
  const flagsWith = (value) => ({ [flag]: value })

  test(`the ${name} limit counts UTF-8 bytes, not characters`, () => {
    const rng = seededRandom(seed)

    for (let i = 0; i < 300; i++) {
      const length = 1 + Math.floor(rng() * (limit + 40))
      const value = randomText(rng, length)
      const bytes = Buffer.byteLength(value, 'utf8')

      let parsed
      let err
      try {
        parsed = parse(flagsWith(value))
      } catch (e) {
        err = e
      }

      if (bytes <= limit) {
        assert.equal(err, undefined)
        assert.deepEqual(parsed, { [field]: value })
      } else {
        assert.ok(err instanceof UsageError)
        assert.ok(err.message.includes('too long'))
      }
    }
  })

  test(`the ${name} limit is inclusive at ${limit} bytes`, () => {
    const asciiAtLimit = 'a'.repeat(limit)
    assert.deepEqual(parse(flagsWith(asciiAtLimit)), { [field]: asciiAtLimit })

    const center = Math.floor(limit / 2)
    for (let length = center - 2; length <= center + 2; length++) {
      const value = 'é'.repeat(length)
      const bytes = Buffer.byteLength(value, 'utf8')

      if (bytes <= limit) {
        assert.deepEqual(parse(flagsWith(value)), { [field]: value })
      } else {
        assert.throws(() => parse(flagsWith(value)), UsageError)
      }
    }
  })

  test(`a missing or empty ${name} is always a usage error`, () => {
    for (const value of [undefined, null]) {
      assert.throws(
        () => parse(flagsWith(value)),
        (err) => err instanceof UsageError && err.message.includes(missingHint)
      )
    }

    assert.throws(
      () => parse(flagsWith('')),
      (err) => err instanceof UsageError && err.message.includes('must not be empty')
    )
  })
}
