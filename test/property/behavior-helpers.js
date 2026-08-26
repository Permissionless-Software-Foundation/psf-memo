/*
  Shared property tests for the Memo post and Set Name behavior slices.

  Both slices validate a value against a length limit, expose a character/byte
  counter that conserves its relationship to input length, round-trip the draft
  text through setInput, and surface broadcast failures without navigating.
  These tests assert those invariants across a broad input range; the slice
  specifics are supplied through `cfg` so the two behavior slices share one
  implementation instead of duplicating it.
*/

'use strict'

const test = require('node:test')

const { forAll, makeStringGen } = require('./harness')
const { fakeWallet } = require('../helpers/fake-wallet')

// Register the property tests shared by a Memo behavior slice. `cfg` supplies
// the slice-specific pieces:
//   Module   - the action class under test (MemoPost or MemoSetName)
//   MAX      - the length limit (characters or bytes)
//   label    - a short label used in test names
//   rng      - the seeded random generator
//   measure  - (input) => length in the slice's unit (chars or bytes)
//   buildPage - () => a fresh page for counter and round-trip tests
//   buildBroadcastPage - ({ wallet, navigations }) => a page wired to broadcast
function registerBehaviorProperties (cfg) {
  const { Module, MAX, label, rng, measure, buildPage, buildBroadcastPage } = cfg
  const stringOf = makeStringGen(rng)

  test(`${label} validation: any non-blank string at or below the limit is valid`, async () => {
    await forAll(
      (i) => {
        const len = 1 + Math.floor(rng() * MAX) // 1..MAX
        return stringOf(len)
      },
      (input) => {
        // A random ASCII string may occasionally be all whitespace; whitespace-only
        // input is a validation error, so only assert for non-blank strings.
        if (input.trim().length === 0) return true
        const result = new Module({}).validate(input)
        return result.ok === true
      },
      { label: 'valid length' }
    )
  })

  test(`${label} validation: any string above the limit is a length error`, async () => {
    await forAll(
      (i) => stringOf(MAX + 1 + Math.floor(rng() * 100)), // > MAX
      (input) => {
        const result = new Module({}).validate(input)
        return result.ok === false && result.type === 'length'
      },
      { label: 'over-long rejected as length' }
    )
  })

  test(`${label} validation: blank and non-string input are validation errors`, async () => {
    await forAll(
      (i) => (i % 2 === 0 ? '   ' : null),
      (input) => {
        const result = new Module({}).validate(input)
        return result.ok === false && result.type === 'validation'
      },
      { label: 'blank/non-string rejected as validation' }
    )
  })

  test(`${label} counter conserves length: remaining === MAX - measure(input)`, async () => {
    await forAll(
      (i) => stringOf(Math.floor(rng() * (MAX + 8))),
      (input) => {
        const page = buildPage()
        page.setInput(input)
        return page.remainingCount() === MAX - measure(input)
      },
      { label: 'counter conservation' }
    )
  })

  test('setInput round-trips the draft text exactly', async () => {
    await forAll(
      (i) => stringOf(Math.floor(rng() * 50)),
      (input) => {
        const page = buildPage()
        page.setInput(input)
        return page.input === input
      },
      { label: 'setInput round-trip' }
    )
  })

  test('a broadcast failure surfaces the error and never navigates', async () => {
    await forAll(
      (i) => ({ text: stringOf(1 + Math.floor(rng() * 40)), failWith: `boom-${i % 97}` }),
      ({ text, failWith }) => {
        const wallet = fakeWallet()
        wallet.failWith = failWith
        const navigations = []
        const page = buildBroadcastPage({ wallet, navigations })
        page.setInput(text)

        return page.submit().then((result) => {
          if (result.ok) return false
          if (page.submitError !== 'broadcast') return false
          if (!page.broadcastError || !page.broadcastError.includes('boom')) return false
          return navigations.length === 0
        })
      },
      { label: 'broadcast failure does not navigate' }
    )
  })
}

module.exports = { registerBehaviorProperties }
