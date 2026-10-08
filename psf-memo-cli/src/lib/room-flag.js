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
