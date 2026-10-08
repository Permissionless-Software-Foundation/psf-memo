/*
  Shared parsing for the required -m Memo text flags.

  The Memo post, name, and bio commands validate their -m text with the same
  missing / empty / over-long contract. Only the field label, the usage message,
  the inclusive limit, and the size measure (UTF-16 code units or UTF-8 bytes)
  differ, so this module owns that shared validation.
*/

// Local libraries
import { UsageError } from './reporter.js'

// Build the -m flag parser for a Memo text command. `measure` returns the size
// counted against the inclusive `limit`; `unit` names that size in the message.
export function memoTextFlagParser ({ field, label, missingMessage, limit, measure, unit }) {
  return function parseMemoTextFlags (flags = {}) {
    const value = flags.memo

    if (value === undefined || value === null) {
      throw new UsageError(missingMessage)
    }

    if (value === '') {
      throw new UsageError(`${label} must not be empty.`)
    }

    if (measure(value) > limit) {
      throw new UsageError(`${label} is too long. Maximum is ${limit} ${unit}.`)
    }

    return { [field]: value }
  }
}
