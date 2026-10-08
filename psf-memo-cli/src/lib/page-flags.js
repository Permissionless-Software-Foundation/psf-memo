/*
  Shared parsing for the --limit/--offset pagination flags.

  Several paginated read commands accept the same non-negative integer page
  flags, so both the validation and its exact usage message live here rather
  than being duplicated across feature modules.
*/

// Local libraries
import { UsageError } from './reporter.js'

// Parse a non-negative integer flag, falling back when it is absent. A bad
// value is a usage error so the caller exits 2 and names the exact flag.
export function parseNonNegativeInteger (value, fallback, flag) {
  if (value === undefined || value === null || value === '') return fallback

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new UsageError(`${flag} must be a non-negative integer.`)
  }
  return parsed
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:57:10.331Z","module_hash":"28c4a27e71ced18497ce4e9c5ef2fe7041309ecc3015f97edc2699a2febc8abb","functions":[{"id":"func/parseNonNegativeInteger","name":"parseNonNegativeInteger","line":14,"end_line":22,"hash":"59414499403988f535c8f64194324787a0f7d585597888e4c06f17f65ff8b5a6"}]}
// mutate4javascript-manifest-end
