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
    await recordTopicPost(adapters, room, blockHeight)
  }
}
