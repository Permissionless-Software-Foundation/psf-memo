/*
  memo-topic-post: broadcast a 0x6d0c Memo topic message.

  It resolves the signing wallet (-n <wallet> or --wif <wif>), requires the topic
  room (-r) and the message text (-m), validates that the room plus message is at
  most the 0x6d0c protocol limit of 214 UTF-8 bytes, broadcasts the multi-field
  Memo action [6d0c, room, message] through the shared multi-push scaffolding,
  and reports the transaction id plus its bch.loping.net explorer link. A missing
  or invalid flag is a usage error (exit 2) with no broadcast; a rejected
  broadcast surfaces the wallet's real error (exit 1).
*/

// Local libraries
import {
  parseTopicPostFlags,
  formatTopicPostMessage,
  MEMO_TOPIC_POST_PREFIX
} from '../lib/memo-topic-post.js'
import { defineFieldsWriteCommand } from '../lib/write-command.js'

const MemoTopicPost = defineFieldsWriteCommand({
  parse: parseTopicPostFlags,
  format: formatTopicPostMessage,
  prefix: MEMO_TOPIC_POST_PREFIX,
  fields: ['room', 'message']
})

export default MemoTopicPost
