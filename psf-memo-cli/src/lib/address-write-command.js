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
