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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:58:45.078Z","module_hash":"2086cb887feb7f74f0eb744211ac6a54fa3906e28f4f487ef0d5b264f5a81e95","functions":[{"id":"func/defineTopicRoomWriteCommand","name":"defineTopicRoomWriteCommand","line":15,"end_line":21,"hash":"9689e99159b887d7002f8d0aa3244ea3f1959556b0921309965935e20ecac488"}]}
// mutate4javascript-manifest-end
