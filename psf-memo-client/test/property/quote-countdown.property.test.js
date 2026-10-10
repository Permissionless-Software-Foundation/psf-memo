/*
  Property tests for the quote countdown formatter.

  The unit tests probe a few fixed durations. These properties pin the
  formatter's invariants over broad random durations:

    - sub-minute: any duration under one minute, including a negative (past)
      expiry, always reads "less than a minute".
    - decomposition: for a whole number of minutes, the label lists exactly
      the whole hours and the remaining minutes, in that order.
    - pluralization: a unit count is singular exactly when it is one.
    - determinism: the same duration always formats the same label.

  All generation is seeded, so runs are reproducible.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { seededRandom, forAll, intGen } = require('./harness')
const { formatCountdown } = require('../../src/services/quote-countdown')

const rng = seededRandom(20261010)
const MINUTE_MS = 60 * 1000

function plural (count, unit) {
  return `${count} ${unit}${count === 1 ? '' : 's'}`
}

// Reference decomposition written from the spec, independent of the
// implementation under test.
function expectedLabel (totalMinutes) {
  if (totalMinutes <= 0) return 'less than a minute'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const parts = []
  if (hours > 0) parts.push(plural(hours, 'hour'))
  if (minutes > 0) parts.push(plural(minutes, 'minute'))
  return parts.join(' ')
}

test('a duration under one minute always reads "less than a minute"', async () => {
  await forAll(
    () => intGen(rng, -600000, MINUTE_MS - 1)(),
    (ms) => formatCountdown(ms) === 'less than a minute',
    { label: 'quote countdown sub-minute' }
  )
})

test('a whole number of minutes decomposes into hours and minutes', async () => {
  await forAll(
    () => intGen(rng, 0, 100000)(),
    (totalMinutes) => formatCountdown(totalMinutes * MINUTE_MS) === expectedLabel(totalMinutes),
    { label: 'quote countdown decomposition' }
  )
})

test('a unit count is singular exactly when it is one', async () => {
  await forAll(
    () => intGen(rng, 0, 5000)(),
    (totalMinutes) => {
      const label = formatCountdown(totalMinutes * MINUTE_MS)
      const matches = [...label.matchAll(/(\d+) (hour|minute)(s?)/g)]
      return matches.every(([, count, , suffix]) => (Number(count) === 1 ? suffix === '' : suffix === 's'))
    },
    { label: 'quote countdown pluralization' }
  )
})

test('formatCountdown is deterministic', async () => {
  await forAll(
    () => intGen(rng, -100000, 100000)() * rng() * MINUTE_MS,
    (ms) => {
      const first = formatCountdown(ms)
      return formatCountdown(ms) === first
    },
    { label: 'quote countdown determinism' }
  )
})

test('the unit tests and the reference agree on fixed fixtures', () => {
  assert.equal(formatCountdown(24 * 60 * MINUTE_MS), '24 hours')
  assert.equal(formatCountdown(90 * MINUTE_MS), '1 hour 30 minutes')
})
