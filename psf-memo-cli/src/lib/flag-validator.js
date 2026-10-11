/*
  Shared validation for command-line flags.

  Commands describe their required flags as an ordered list of [value, message]
  pairs. Validation stops at the first missing value and throws that message as
  a UsageError (exit 2), so each command keeps its original error text and
  reporting order while adopting the shared output contract.
*/

// Local libraries
import { UsageError } from './reporter.js'

// Throw the supplied message when a required flag is missing or empty.
export function requireFlag (value, message) {
  if (!value || value === '') {
    throw new UsageError(message)
  }
}

// Validate an ordered list of [value, message] rules. Returns true when every
// required flag is present.
export function validateRequiredFlags (rules) {
  for (const [value, message] of rules) {
    requireFlag(value, message)
  }

  return true
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T18:42:08.951Z","module_hash":"ddf9ba3c0f97018717b337dc9b587e7814480191185fa2793551814760768b57","functions":[{"id":"func/requireFlag","name":"requireFlag","line":14,"end_line":18,"hash":"16985e6a5f256dd0c6a67a93989ddc39ec4e023ae4883170b292b5eaf33a93a0"},{"id":"func/validateRequiredFlags","name":"validateRequiredFlags","line":22,"end_line":28,"hash":"61ee3478f59b106a22f6c75a122b7559e84459c1a8f51af1c49794a9b46f7515"}]}
// mutate4javascript-manifest-end
