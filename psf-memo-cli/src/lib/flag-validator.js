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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:50:30.077Z","module_hash":"73cfb8f00b2bc32c6f6bbbd3c3b7fe9e5c0b12168fb37abd8c2dd6c986e188df","functions":[{"id":"func/requireFlag","name":"requireFlag","line":10,"end_line":14,"hash":"21f3efb5ce287a7e50cd63c8544cc29ca50ee4193f33d6790736e2a5de20775d"},{"id":"func/validateRequiredFlags","name":"validateRequiredFlags","line":18,"end_line":24,"hash":"61ee3478f59b106a22f6c75a122b7559e84459c1a8f51af1c49794a9b46f7515"}]}
// mutate4javascript-manifest-end
