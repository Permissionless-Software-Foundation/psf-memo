/*
  Pure helpers shared by the follow-list read commands (memo-following and
  memo-followers).

  Both commands report an unpaginated list of cash addresses: the addresses a
  wallet follows, and the addresses that follow a target. This module owns the
  follower -a flag, the following wallet-source passthrough, and the shared
  human-readable summary of an address list.
*/

// Local libraries
import { parseAddressFlag } from './address-flag.js'

export const MISSING_FOLLOWEE_MESSAGE =
  'You must specify a followee address with the -a flag.'

// Normalize the wallet source for memo-following. Its presence is validated
// when the source is resolved (resolveWalletSource), so only the flags are
// resolved here.
export function parseFollowingFlags (flags = {}) {
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
// {"version":1,"tested_at":"2026-10-08T01:13:20.378Z","module_hash":"ace9170e2f917defe9bf427e7153e01a460a69bdd256bce9d180fff647b53ffc","functions":[{"id":"func/parseFollowingFlags","name":"parseFollowingFlags","line":20,"end_line":25,"hash":"6c5274219a1af598779576fbe3567907437fb1131005c36ecc2a7b2212ab1408"},{"id":"func/parseFollowersFlags","name":"parseFollowersFlags","line":29,"end_line":33,"hash":"1131d345e893d9a9ba26c05f5d9749b61ce453c42cc0f9fe723ac9ca820ab4c6"},{"id":"func/formatFollowListMessage","name":"formatFollowListMessage","line":37,"end_line":40,"hash":"98f4cd5f9ca7f556cea555f3c713176dd943d3a5a2fcc93ad599b7bf803d3099"}]}
// mutate4javascript-manifest-end
