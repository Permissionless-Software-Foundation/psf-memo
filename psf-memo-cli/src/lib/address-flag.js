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
// {"version":1,"tested_at":"2026-10-07T20:42:49.278Z","module_hash":"3e4c92738ec750d3c477708d1f774740ab9c56092569f88f14d5aa7aa0d97fd9","functions":[{"id":"func/parseAddressFlag","name":"parseAddressFlag","line":15,"end_line":23,"hash":"5f1f23d5045cfc0a12468a8f7d11aa66f5b42c7a9f6cfec2730c42dec4114f38"}]}
// mutate4javascript-manifest-end
