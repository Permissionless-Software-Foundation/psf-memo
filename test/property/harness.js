/*
  Small property-testing harness for psf-memo-client.

  Node's built-in test runner has no property-based generator, so this module
  provides a tiny deterministic, seeded pseudo-random generator plus a helper
  to run a property across many samples and report a counterexample. All
  generation is seeded, so runs are reproducible.
*/

'use strict'

const assert = require('node:assert/strict')

// A small deterministic PRNG (mulberry32). Same seed => same stream.
function seededRandom (seed = 12345) {
  let a = seed >>> 0
  return function next () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Run a property across N samples. `gen` returns a fresh input; `check`
// returns true when the property holds. Asserts a counterexample on failure.
async function forAll (gen, check, { samples = 500, label = 'property' } = {}) {
  for (let i = 0; i < samples; i++) {
    const input = gen(i)
    const ok = await check(input)
    assert.ok(ok, `${label} failed at sample ${i} for input: ${JSON.stringify(input)}`)
  }
}

// Generate a random ASCII string of a given length using a seeded RNG.
function makeStringGen (rng) {
  return (length) => {
    const chars = []
    for (let i = 0; i < length; i++) {
      // Mix of printable ASCII (32..126).
      chars.push(String.fromCharCode(32 + Math.floor(rng() * 95)))
    }
    return chars.join('')
  }
}

module.exports = { seededRandom, forAll, makeStringGen }
