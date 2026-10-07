/*
  Property test for Memo push construction.

  buildMemoPushes must always produce exactly one prefix push followed by one
  push per field, in order, with the field bytes preserved.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { buildMemoPushes } from '../../src/lib/memo-broadcast.js'

// Alternate between UTF-8 text (including multibyte characters) and raw byte
// fields so both branches of toPushBuffer are exercised.
function randomField (rng) {
  if (rng() < 0.5) {
    const chars = 'abcXYZ09 é中✓'
    const length = Math.floor(rng() * 12)
    let text = ''
    for (let i = 0; i < length; i++) {
      text += chars[Math.floor(rng() * chars.length)]
    }
    return text
  }

  const length = Math.floor(rng() * 40)
  const bytes = Buffer.alloc(length)
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(rng() * 256)
  }
  return bytes
}

test('buildMemoPushes preserves the prefix and every field byte-for-byte in order', () => {
  const rng = seededRandom(20261013)

  for (let i = 0; i < 200; i++) {
    const count = Math.floor(rng() * 5)
    const fields = []
    for (let j = 0; j < count; j++) {
      fields.push(randomField(rng))
    }
    const prefix = `6d${(10 + Math.floor(rng() * 10)).toString(16).padStart(2, '0')}`

    const pushes = buildMemoPushes(prefix, fields)

    assert.equal(pushes.length, count + 1)
    assert.equal(pushes[0].toString('hex'), prefix)
    fields.forEach((field, j) => {
      const expected = typeof field === 'string' ? Buffer.from(field, 'utf8') : Buffer.from(field)
      assert.ok(pushes[j + 1].equals(expected), `field ${j} bytes preserved in order`)
    })
  }
})
