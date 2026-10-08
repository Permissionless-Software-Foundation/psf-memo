/*
  Pure helpers shared by the wallet/list read commands (memo-following,
  memo-followers, and memo-muted).

  The wallet-scoped commands report an unpaginated list of cash addresses: the
  addresses a wallet follows, the addresses that follow a target, and the
  addresses a wallet mutes. This module owns the required followee -a flag, the
  wallet-source passthrough, and the shared human-readable summary of an address
  list.
*/

// Local libraries
import { parseAddressFlag } from './address-flag.js'

export const MISSING_FOLLOWEE_MESSAGE =
  'You must specify a followee address with the -a flag.'

// Normalize a wallet source (name/WIF) for a wallet-scoped list command. Its
// presence is validated when the source is resolved (resolveWalletSource), so
// only the flags are resolved here.
export function parseWalletSourceFlags (flags = {}) {
  return {
    name: flags.name || null,
    wif: flags.wif || null
  }
}

// Resolve the required followee -a address for memo-followers. Throws a
// UsageError (exit 2) when it is missing.
export function parseFollowersFlags (flags = {}) {
  return {
    address: parseAddressFlag(flags, MISSING_FOLLOWEE_MESSAGE)
  }
}

// Render an unpaginated address list: the "Read N <label> address(es)" count
// line followed by one address per line.
export function formatFollowListMessage (addresses = [], label) {
  const noun = addresses.length === 1 ? 'address' : 'addresses'
  return [`Read ${addresses.length} ${label} ${noun}`, ...addresses].join('\n')
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T01:29:09.087Z","module_hash":"3aeafced0c3b0168b154afcaeddc90b7ac8cf3f910d9564dcd21b6225b70ffa0","functions":[{"id":"func/parseWalletSourceFlags","name":"parseWalletSourceFlags","line":21,"end_line":26,"hash":"f39c6b34c5e224085197960cd4fa78d87777148cf61e740b58e6af6a0672da94"},{"id":"func/parseFollowersFlags","name":"parseFollowersFlags","line":30,"end_line":34,"hash":"1131d345e893d9a9ba26c05f5d9749b61ce453c42cc0f9fe723ac9ca820ab4c6"},{"id":"func/formatFollowListMessage","name":"formatFollowListMessage","line":38,"end_line":41,"hash":"98f4cd5f9ca7f556cea555f3c713176dd943d3a5a2fcc93ad599b7bf803d3099"}]}
// mutate4javascript-manifest-end
