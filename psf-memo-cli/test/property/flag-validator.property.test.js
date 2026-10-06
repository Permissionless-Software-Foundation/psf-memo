/*
  Property tests for the shared flag validator.

  Unit tests cover fixed examples. These properties exercise broad input
  ranges to confirm the invariants hold everywhere:

    - requireFlag throws exactly when a value is missing or empty.
    - validateRequiredFlags returns true only when every rule is satisfied,
      and otherwise reports the first missing rule's message.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { requireFlag, validateRequiredFlags } from '../../src/lib/flag-validator.js'

const rng = seededRandom(20261006)

// Values the original inline checks treated as missing.
function randomMissingValue () {
  const choices = [undefined, null, '', 0, false, NaN]
  return choices[Math.floor(rng() * choices.length)]
}

// Values the original inline checks accepted.
function randomPresentValue () {
  const kind = Math.floor(rng() * 4)
  if (kind === 0) return `v${Math.floor(rng() * 1000)}`
  if (kind === 1) return 1 + Math.floor(rng() * 1000)
  if (kind === 2) return true
  return { present: true }
}

function isMissing (value) {
  return !value || value === ''
}

test('requireFlag throws exactly when a value is missing', () => {
  for (let i = 0; i < 500; i++) {
    const value = rng() < 0.4 ? randomMissingValue() : randomPresentValue()
    const message = `missing-${i}`

    if (isMissing(value)) {
      assert.throws(
        () => requireFlag(value, message),
        (err) => err.message === message
      )
    } else {
      assert.equal(requireFlag(value, message), undefined)
    }
  }
})

test('validateRequiredFlags returns true or reports the first missing rule', () => {
  for (let i = 0; i < 500; i++) {
    const count = Math.floor(rng() * 5)
    const rules = []
    for (let j = 0; j < count; j++) {
      const value = rng() < 0.35 ? randomMissingValue() : randomPresentValue()
      rules.push([value, `rule-${i}-${j}`])
    }

    const firstMissing = rules.findIndex(([value]) => isMissing(value))

    if (firstMissing === -1) {
      assert.equal(validateRequiredFlags(rules), true)
    } else {
      assert.throws(
        () => validateRequiredFlags(rules),
        (err) => err.message === rules[firstMissing][1]
      )
    }
  }
})
