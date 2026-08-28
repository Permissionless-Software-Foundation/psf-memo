import { utf8FromPush, logProcessError, normalizeTwoPushMemoDatas, postHeightKey, addrPostHeightKey } from './helpers.js'
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
  const addrHeightKey = addrPostHeightKey(signerAddr, blockHeight, txid)
  await createIfMissing(adapters.postDb, txid, postData)
  await createIfMissing(adapters.postHeightDb, heightKey, { txid, blockHeight })
  await createIfMissing(adapters.addrPostHeightDb, addrHeightKey, { txid, addr: signerAddr, blockHeight })
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T04:25:56.092Z","module_hash":"0f471223ce221777762f87eb02cc7921f2db624ecb1e333a148f9c682c383330","functions":[{"id":"func/createIfMissing","name":"createIfMissing","line":5,"end_line":11,"hash":"d59cefaf87075a2bc41538961b609387e35393d4fbf02ecfc0633026bbfdca42"},{"id":"func/handlePost","name":"handlePost","line":13,"end_line":38,"hash":"928ea72312ac9d0b94dbe93adef0b775bc8df158177c1b0adbac8cafe2da76d8"}]}
// mutate4javascript-manifest-end
