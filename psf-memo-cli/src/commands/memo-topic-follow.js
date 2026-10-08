/*
  memo-topic-follow: broadcast a 0x6d0d Memo topic-follow action.

  It resolves the signing wallet (-n <wallet> or --wif <wif>), requires the topic
  room (-r), broadcasts the two-push Memo action [6d0d, room] through the shared
  broadcast scaffolding, and reports the transaction id plus its bch.loping.net
  explorer link. The room is plain UTF-8 text (no cashaddr conversion). A missing
  room is a usage error (exit 2) with no broadcast; a rejected broadcast surfaces
  the wallet's real error (exit 1).
*/

// Local libraries
import { defineTopicRoomWriteCommand } from '../lib/topic-room-write-command.js'

const MemoTopicFollow = defineTopicRoomWriteCommand({
  prefix: '6d0d',
  verb: 'Followed topic'
})

export default MemoTopicFollow
