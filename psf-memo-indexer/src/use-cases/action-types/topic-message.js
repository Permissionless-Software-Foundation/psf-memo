import { utf8FromPush, logProcessError, roomKey, getIfPresent } from './helpers.js'
import { MAX_POST_SIZE } from '../../lib/memo-codes.js'
import { handlePost } from './post.js'
import { recordTopicPost } from './topic-indexing.js'

export async function handleTopicMessage (ctx) {
  const { adapters, txid, decoded, seen, blockHeight } = ctx
  const { pushDatas } = decoded

  if (pushDatas.length !== 3) {
    await logProcessError(adapters, txid, `invalid topic message push data count ${pushDatas.length}`, blockHeight)
    return
  }

  const room = utf8FromPush(pushDatas[1])
  const message = utf8FromPush(pushDatas[2])
  if ((room.length + message.length) > MAX_POST_SIZE) {
    await logProcessError(adapters, txid, 'topic message too large', blockHeight)
    return
  }

  // The room record is the marker that this topic message was already
  // indexed. Check it before writing so reprocessing does not double-count the
  // room's post summary.
  const key = roomKey(room, txid)
  const alreadyIndexed = (await getIfPresent(adapters.roomDb, key)) !== null

  await handlePost({
    ...ctx,
    decoded: { ...decoded, pushDatas: [pushDatas[0], pushDatas[2]] }
  })

  await adapters.roomDb.create(key, { room, txid, seen, type: 'post', blockHeight })

  if (!alreadyIndexed) {
    await recordTopicPost(adapters, room, blockHeight, seen)
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-18T13:06:18.562Z","module_hash":"b991a1ddf77b69bb3751a9e92e2531c50ed0aa980988a7d901d4eb0df891ff75","functions":[{"id":"func/handleTopicMessage","name":"handleTopicMessage","line":6,"end_line":38,"hash":"5de80e5dbb72e58d371e9c7382347171083bec81db141a186a222df4499b5499"}]}
// mutate4javascript-manifest-end
