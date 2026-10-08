/*
  Shared parsing for the required Memo text flags.

  The Memo post, name, bio, and avatar commands validate their text flag with the
  same missing / empty / over-long contract. Only the source flag, the field
  label, the usage message, the inclusive limit, and the size measure (UTF-16
  code units or UTF-8 bytes) differ, so this module owns that shared validation.
*/

// Local libraries
import { UsageError } from './reporter.js'

// Build the text flag parser for a Memo command. `flag` names the option's flag
// property (default `-m`); `measure` returns the size counted against the
// inclusive `limit`; `unit` names that size in the message.
export function memoTextFlagParser ({ flag = 'memo', field, label, missingMessage, limit, measure, unit }) {
  return function parseMemoTextFlags (flags = {}) {
    const value = flags[flag]

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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:55:26.535Z","module_hash":"6dce82a5df3b9b51be9add45d16832148263c685525396366f8acaf59210e8cf","functions":[{"id":"func/memoTextFlagParser","name":"memoTextFlagParser","line":16,"end_line":34,"hash":"8fd902703a33459e0b2c59eea5195fb85fe49f8999db2f2d20bfc11bffc0befd"}]}
// mutate4javascript-manifest-end
