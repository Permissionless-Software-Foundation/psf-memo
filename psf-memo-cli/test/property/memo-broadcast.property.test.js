/*
  Property test for Memo push construction.

  buildMemoPushes must always produce exactly one prefix push followed by one
  push per field, in order, with the field bytes preserved.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { buildMemoPushes } from '../../src/lib/memo-broadcast.js'

test('buildMemoPushes preserves the prefix and field order', () => {
  const rng = seededRandom(20261013)

  for (let i = 0; i < 200; i++) {
    const count = Math.floor(rng() * 5)
    const fields = []
    for (let j = 0; j < count; j++) {
      fields.push(`field-${i}-${j}`)
    }
    const prefix = `6d${(10 + Math.floor(rng() * 10)).toString(16).padStart(2, '0')}`

    const pushes = buildMemoPushes(prefix, fields)

    assert.equal(pushes.length, count + 1)
    assert.equal(pushes[0].toString('hex'), prefix)
    for (let j = 0; j < count; j++) {
      assert.equal(pushes[j + 1].toString('utf8'), fields[j])
    }
  }
})
