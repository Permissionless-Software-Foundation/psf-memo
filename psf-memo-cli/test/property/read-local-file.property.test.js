/*
  Property tests for the shared local-file reader.

  Unit tests pin the fixed value and message. These properties exercise broad
  input ranges to confirm:

    - pass-through: any value the injected reader returns is returned verbatim.
    - failure mapping: any thrown reader error becomes the documented
      "Cannot read file: <path>" message for the requested path.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { readLocalFile } from '../../src/lib/read-local-file.js'

const rng = seededRandom(20261013)

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-_.'

function randomText (maxLength) {
  const length = 1 + Math.floor(rng() * maxLength)
  let text = ''
  for (let i = 0; i < length; i++) text += CHARS[Math.floor(rng() * CHARS.length)]
  return text
}

function randomBytes () {
  const length = Math.floor(rng() * 64)
  const bytes = Buffer.alloc(length)
  for (let i = 0; i < length; i++) bytes[i] = Math.floor(rng() * 256)
  return bytes
}

test('readLocalFile returns the reader value verbatim', () => {
  for (let i = 0; i < 300; i++) {
    const bytes = randomBytes()
    const path = `./${randomText(12)}.bin`

    assert.equal(readLocalFile(() => bytes, path), bytes)
  }
})

test('readLocalFile maps every read failure to the documented message', () => {
  for (let i = 0; i < 300; i++) {
    const path = `./${randomText(12)}.bin`

    let err
    try {
      readLocalFile(() => { throw new Error(randomText(20)) }, path)
    } catch (e) {
      err = e
    }

    assert.ok(err instanceof Error)
    assert.equal(err.message, `Cannot read file: ${path}`)
  }
})
