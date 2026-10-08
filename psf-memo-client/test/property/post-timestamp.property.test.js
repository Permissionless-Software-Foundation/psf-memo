/*
  Property tests for the post timestamp formatter.

  The unit tests probe a few fixed instants. These properties cover broad
  ranges so the formatter's invariants hold everywhere:

    - falsy: any falsy `seen` formats to the empty string.
    - equivalence: the same instant formats identically whether it is expressed
      as epoch seconds or epoch milliseconds, and a positive instant is never
      blank.
    - millisecond branch: values above the seconds/milliseconds threshold format
      the same as their seconds form.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen } = require('./harness')
const { formatSeen } = require('../../src/services/post-timestamp')

const rng = seededRandom(20261008)

// The set of falsy values a post's `seen` field may carry.
const FALSY = [0, null, undefined, '', NaN]

test('formatSeen is empty for every falsy value', async () => {
  await forAll(
    (i) => FALSY[i % FALSY.length],
    (value) => formatSeen(value) === '',
    { label: 'post timestamp falsy' }
  )
})

test('formatSeen formats the same instant identically in seconds and milliseconds', async () => {
  await forAll(
    (i) => intGen(rng, 1e9, 2e9)(),
    (seconds) => {
      const formatted = formatSeen(seconds)
      return formatted.length > 0 && formatted === formatSeen(seconds * 1000)
    },
    { label: 'post timestamp seconds/milliseconds equivalence' }
  )
})

test('formatSeen treats large millisecond values as their seconds instant', async () => {
  await forAll(
    (i) => intGen(rng, 1e9, 2e9)() * 1000,
    (ms) => formatSeen(ms) === formatSeen(ms / 1000),
    { label: 'post timestamp millisecond branch' }
  )
})
