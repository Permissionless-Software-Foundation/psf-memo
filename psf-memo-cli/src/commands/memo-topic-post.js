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
import { initWriteCommand, runWriteCommand } from '../lib/write-command.js'

class MemoTopicPost {
  constructor (options = {}) {
    initWriteCommand(this, options)
  }

  // Validate the room and message, resolve the wallet, broadcast the topic
  // message, and report the txid and explorer link. Returns the exit code.
  async run (flags = {}) {
    return runWriteCommand({
      command: this,
      flags,
      parse: parseTopicPostFlags,
      format: formatTopicPostMessage
    })
  }

  // Validate the room and message. The wallet source is validated by the shared
  // resolver during run. Returns true when the flags are usable.
  validateFlags (flags = {}) {
    parseTopicPostFlags(flags)
    return true
  }

  // Broadcast the multi-field topic message action through the shared
  // scaffolding.
  post ({ wallet, room, message }) {
    return this.broadcast({
      wallet,
      prefix: MEMO_TOPIC_POST_PREFIX,
      fields: [room, message]
    })
  }
}

export default MemoTopicPost
