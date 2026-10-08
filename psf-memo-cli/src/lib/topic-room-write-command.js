/*
  Shared construction for the single-field topic room write commands.

  memo-topic-follow and memo-topic-unfollow resolve a wallet, require the -r
  room, and broadcast that room as plain UTF-8 text under their own action
  prefix. This factory owns the parser and the summary so each command declares
  only its prefix and verb.
*/

// Local libraries
import { defineFieldWriteCommand } from './write-command.js'
import { parseRoomFlag } from './room-flag.js'

// Build a command class that broadcasts the required room under `prefix`.
export function defineTopicRoomWriteCommand ({ prefix, verb }) {
  const parse = (flags) => ({ room: parseRoomFlag(flags) })
  const format = ({ txid, explorerUrl }) =>
    `${verb}: ${txid}\nView this transaction on a block explorer:\n${explorerUrl}`

  return defineFieldWriteCommand({ parse, format, prefix, field: 'room' })
}
