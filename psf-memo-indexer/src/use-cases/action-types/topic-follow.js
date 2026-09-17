import { utf8FromPush, logProcessError, roomKey } from './helpers.js'
import { PREFIX_TOPIC_UNFOLLOW } from '../../lib/memo-codes.js'
import { ensureTopicRoom } from './topic-indexing.js'

export async function handleTopicFollow (ctx) {
  const { adapters, txid, signerAddr, decoded, seen, blockHeight } = ctx
  const { pushDatas, prefix } = decoded

  if (pushDatas.length !== 2) {
    await logProcessError(adapters, txid, `invalid topic follow push data count ${pushDatas.length}`, blockHeight)
    return
  }

  const room = utf8FromPush(pushDatas[1])
  const unfollow = prefix[1] === PREFIX_TOPIC_UNFOLLOW[1]

  await adapters.roomDb.create(roomKey(room, signerAddr), {
    room,
    addr: signerAddr,
    unfollow,
    txid,
    seen,
    type: 'follow',
    blockHeight
  })

  if (!unfollow) {
    await ensureTopicRoom(adapters, room)
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-17T16:34:56.427Z","module_hash":"98bbf2e83e9afae81b2a25b3b03d66a32c9af7864e8eace4aec99b16dfe773b5","functions":[{"id":"func/handleTopicFollow","name":"handleTopicFollow","line":5,"end_line":30,"hash":"6137b8d03c0bcf24ddd08824e462565407677303981b1a376b94e449897e217a"}]}
// mutate4javascript-manifest-end
