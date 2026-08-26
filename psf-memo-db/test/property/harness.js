/*
  Small property-testing harness for psf-memo-db.

  The DB runs its unit tests with mocha and has no property-based generator,
  so this module provides a deterministic, seeded pseudo-random generator plus
  a helper to run a property across many samples and report a counterexample.
  All generation is seeded, so runs are reproducible.
*/

import assert from 'node:assert/strict'

// A small deterministic PRNG (mulberry32). Same seed => same stream.
export function seededRandom (seed = 12345) {
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
export async function forAll (gen, check, { samples = 500, label = 'property' } = {}) {
  for (let i = 0; i < samples; i++) {
    const input = gen(i)
    const ok = await check(input)
    assert.ok(ok, `${label} failed at sample ${i} for input: ${JSON.stringify(input)}`)
  }
}

// Uniform integer in [min, max] inclusive using a seeded rng.
export function intGen (rng, min, max) {
  return () => min + Math.floor(rng() * (max - min + 1))
}

// Random 64-char hex txid using a seeded rng.
export function txidGen (rng) {
  const hex = '0123456789abcdef'
  let out = ''
  for (let i = 0; i < 64; i++) {
    out += hex[Math.floor(rng() * hex.length)]
  }
  return out
}
