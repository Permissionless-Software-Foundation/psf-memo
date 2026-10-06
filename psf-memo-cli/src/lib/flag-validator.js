/*
  Shared validation for command-line flags.

  Commands describe their required flags as an ordered list of [value, message]
  pairs. Validation stops at the first missing value and throws that message, so
  each command keeps its original error text and reporting order.
*/

// Throw the supplied message when a required flag is missing or empty.
export function requireFlag (value, message) {
  if (!value || value === '') {
    throw new Error(message)
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
