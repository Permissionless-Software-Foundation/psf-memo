/*
  Small deterministic property-testing harness for psf-memo-cli.

  The CLI runs its unit tests with node:test and has no property-based
  generator, so this module provides a seeded pseudo-random generator and a
  helper that runs a property across many samples and reports a
  counterexample. Generation is seeded, so runs are reproducible.
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

// A random address-like string: `<prefix>-<index>-<hex>`.
export function randomAddress (rng, prefix, index) {
  return `${prefix}-${index}-${Math.floor(rng() * 1e9).toString(16)}`
}

// A random list of address-like strings, bounded by maxItems.
export function randomAddresses (rng, { prefix = 'addr', maxItems = 10 } = {}) {
  const count = Math.floor(rng() * (maxItems + 1))
  const addresses = []
  for (let i = 0; i < count; i++) addresses.push(randomAddress(rng, prefix, i))
  return addresses
}

// A random string of 1..maxLength characters drawn from `alphabet`.
export function randomText (rng, alphabet, maxLength) {
  const length = 1 + Math.floor(rng() * maxLength)
  let text = ''
  for (let i = 0; i < length; i++) text += alphabet[Math.floor(rng() * alphabet.length)]
  return text
}
