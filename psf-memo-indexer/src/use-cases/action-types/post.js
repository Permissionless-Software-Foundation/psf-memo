import { utf8FromPush, logProcessError, normalizeTwoPushMemoDatas, postHeightKey } from './helpers.js'
import { MAX_POST_SIZE } from '../../lib/memo-codes.js'

// Create a record only when it does not already exist (idempotent writes).
async function createIfMissing (db, key, value) {
  try {
    await db.get(key)
  } catch (err) {
    await db.create(key, value)
  }
}

export async function handlePost (ctx) {
  const { adapters, txid, signerAddr, decoded, seen, blockHeight } = ctx
  const pushDatas = normalizeTwoPushMemoDatas(decoded.pushDatas)

  if (pushDatas.length !== 2) {
    await logProcessError(adapters, txid, `invalid post push data count ${pushDatas.length}`, blockHeight)
    return
  }

  const text = utf8FromPush(pushDatas[1])
  if (!text.length) {
    await logProcessError(adapters, txid, 'empty post', blockHeight)
    return
  }
  if (text.length > MAX_POST_SIZE) {
    await logProcessError(adapters, txid, 'post too large', blockHeight)
    return
  }

  const postData = { addr: signerAddr, text, seen, blockHeight }
  const heightKey = postHeightKey(blockHeight, txid)
  await createIfMissing(adapters.postDb, txid, postData)
  await createIfMissing(adapters.postHeightDb, heightKey, { txid, blockHeight })
}
