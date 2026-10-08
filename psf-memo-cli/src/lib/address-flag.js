/*
  Shared parsing for the required -a address flag.

  Several Memo commands identify a target address with -a. Read commands need
  the address verbatim, so both the presence check and its exact usage message
  live here. The follow/mute write commands need the address as its 20-byte
  hash160 in display order, so the shared hash160 parser is here too.
*/

// Local libraries
import { UsageError } from './reporter.js'
import { addressToHash160 } from './wire-encoding.js'

// Resolve the required -a address. Throws the supplied UsageError message (exit
// 2) when it is missing.
export function parseAddressFlag (flags = {}, message) {
  const address = flags.addr

  if (!address) {
    throw new UsageError(message)
  }

  return address
}

// Build an -a address parser that resolves the address to its 20-byte hash160
// in display order (never byte-reversed). A missing address throws the supplied
// message; a malformed address throws its decoder's usage error.
export function addressHash160FlagParser (missingMessage) {
  return function parseAddressHash160Flags (flags = {}) {
    const address = parseAddressFlag(flags, missingMessage)

    try {
      return { hash160: addressToHash160(address) }
    } catch (err) {
      throw new UsageError(err.message)
    }
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-07T20:42:49.278Z","module_hash":"3e4c92738ec750d3c477708d1f774740ab9c56092569f88f14d5aa7aa0d97fd9","functions":[{"id":"func/parseAddressFlag","name":"parseAddressFlag","line":15,"end_line":23,"hash":"5f1f23d5045cfc0a12468a8f7d11aa66f5b42c7a9f6cfec2730c42dec4114f38"}]}
// mutate4javascript-manifest-end
