/*
  Test helper: small seeded random generators shared by the property tests.

  Each generator consumes the caller's seeded rng in a fixed order, so the
  owning test's stream stays reproducible.
*/

'use strict'

// A random string of `min`..`max` characters drawn from `chars`.
function randomString (rng, chars, min, max) {
  const n = min + Math.floor(rng() * (max - min + 1))
  let out = ''
  for (let i = 0; i < n; i++) out += chars[Math.floor(rng() * chars.length)]
  return out
}

// A random space-separated string of `min`..`max` words drawn from `words`.
function randomWords (rng, words, min, max) {
  const n = min + Math.floor(rng() * (max - min + 1))
  let out = ''
  for (let i = 0; i < n; i++) {
    out += `${words[Math.floor(rng() * words.length)]} `
  }
  return out.trim()
}

module.exports = { randomString, randomWords }
