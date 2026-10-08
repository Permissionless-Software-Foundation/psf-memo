/*
  Shared parsing for the required -r topic room flag.

  The topic write commands (memo-topic-post, memo-topic-follow, and
  memo-topic-unfollow) all identify a topic room with -r, so the presence check
  and its exact usage message live here.
*/

// Local libraries
import { UsageError } from './reporter.js'

export const MISSING_ROOM_MESSAGE = 'You must specify a topic room with the -r flag.'

// Resolve the required -r room. Throws a UsageError (exit 2) when it is missing.
export function parseRoomFlag (flags = {}) {
  const room = flags.room

  if (!room) {
    throw new UsageError(MISSING_ROOM_MESSAGE)
  }

  return room
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:58:12.526Z","module_hash":"eb15271919b1c95859175cf5117274c3bae32972658f3c5a47600bf202d8efc0","functions":[{"id":"func/parseRoomFlag","name":"parseRoomFlag","line":15,"end_line":23,"hash":"f8f9734d6ae00b22e9c46bedc94ec2cf64d88d47139dd3c5a9f8f6ce7cfc31c4"}]}
// mutate4javascript-manifest-end
