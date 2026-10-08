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
