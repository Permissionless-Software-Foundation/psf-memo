/*
  Small property-testing harness for psf-memo-indexer.

  Mirrors psf-memo-db/test/property/harness.js: a deterministic, seeded PRNG
  plus a forAll helper so property runs are reproducible without a property
  framework dependency.
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

export async function forAll (gen, check, { samples = 500, label = 'property' } = {}) {
  for (let i = 0; i < samples; i++) {
    const input = gen(i)
    const ok = await check(input)
    assert.ok(ok, `${label} failed at sample ${i} for input: ${JSON.stringify(input)}`)
  }
}

export function intGen (rng, min, max) {
  return () => min + Math.floor(rng() * (max - min + 1))
}

export function txidGen (rng) {
  const hex = '0123456789abcdef'
  let out = ''
  for (let i = 0; i < 64; i++) {
    out += hex[Math.floor(rng() * hex.length)]
  }
  return out
}
