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
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
