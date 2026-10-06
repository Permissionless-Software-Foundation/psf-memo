/*
  Property tests for bindMethods.

  The structural property is that every named method stays bound to the target
  even after it is detached from the object, and that bindMethods returns the
  target itself.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { bindMethods } from '../../src/lib/bind-methods.js'

const rng = seededRandom(20261008)

test('bindMethods binds every named method to the target', () => {
  for (let i = 0; i < 200; i++) {
    const count = 1 + Math.floor(rng() * 5)
    const names = []
    const target = { marker: `m${i}` }

    for (let j = 0; j < count; j++) {
      const name = `method${j}`
      names.push(name)
      target[name] = function () { return this }
    }

    const result = bindMethods(target, names)
    assert.equal(result, target)

    for (const name of names) {
      const detached = target[name]
      assert.equal(detached(), target)
      assert.equal(detached().marker, `m${i}`)
    }
  }
})
