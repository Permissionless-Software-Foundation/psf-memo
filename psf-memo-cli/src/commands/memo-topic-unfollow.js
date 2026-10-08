/*
  memo-topic-unfollow: broadcast a 0x6d0e Memo topic-unfollow action.

  It resolves the signing wallet (-n <wallet> or --wif <wif>), requires the topic
  room (-r), broadcasts the two-push Memo action [6d0e, room] through the shared
  broadcast scaffolding, and reports the transaction id plus its bch.loping.net
  explorer link. The room is plain UTF-8 text (no cashaddr conversion). A missing
  room is a usage error (exit 2) with no broadcast; a rejected broadcast surfaces
  the wallet's real error (exit 1).
*/

// Local libraries
import { defineTopicRoomWriteCommand } from '../lib/topic-room-write-command.js'

const MemoTopicUnfollow = defineTopicRoomWriteCommand({
  prefix: '6d0e',
  verb: 'Unfollowed topic'
})

export default MemoTopicUnfollow

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:46:57.995Z","module_hash":"1692b5b427f2be09f2de023351a6c35f726075c185d8e27b945c0cf82e02b7f3","functions":[]}
// mutate4javascript-manifest-end
