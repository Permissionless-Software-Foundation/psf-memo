/*
  Shared parsing for the required -a address flag.

  Several Memo read commands identify a target address, so both the validation
  and its exact usage message live here rather than being duplicated across
  feature modules. The message is supplied by the caller because each command
  names its own address role (profile, author, ...).
*/

// Local libraries
import { UsageError } from './reporter.js'

// Resolve the required -a address. Throws the supplied UsageError message (exit
// 2) when it is missing.
export function parseAddressFlag (flags = {}, message) {
  const address = flags.addr

  if (!address) {
    throw new UsageError(message)
  }

  return address
}

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
