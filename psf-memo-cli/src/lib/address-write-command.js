/*
  Shared construction for the single-field follow/mute write commands.

  memo-follow, memo-unfollow, memo-mute, and memo-unmute all resolve a wallet,
  decode the required -a target address to its 20-byte hash160 in display order
  (never byte-reversed), and broadcast that one field under their own action
  prefix. This factory owns the parser and the summary so each command declares
  only its prefix, address role, and verb.
*/

// Local libraries
import { defineFieldWriteCommand } from './write-command.js'
import { addressHash160FlagParser } from './address-flag.js'

// Build a command class that broadcasts one address hash160 field under
// `prefix`. `missingMessage` names the command's address role; `verb` leads the
// human-readable summary.
export function defineAddressWriteCommand ({ prefix, missingMessage, verb }) {
  const parse = addressHash160FlagParser(missingMessage)
  const format = ({ txid, explorerUrl }) =>
    `${verb}: ${txid}\nView this transaction on a block explorer:\n${explorerUrl}`

  return defineFieldWriteCommand({ parse, format, prefix, field: 'hash160' })
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T02:22:25.702Z","module_hash":"a300e7e6899ba0aedd6beccc9a6d938a95e901f8b6a586059b83e8c2b5b1896a","functions":[{"id":"func/defineAddressWriteCommand","name":"defineAddressWriteCommand","line":18,"end_line":24,"hash":"6a51552c6aadc46ab1688d5f7a56a2f57887407fe0821bf4a290a872aec23f33"}]}
// mutate4javascript-manifest-end
