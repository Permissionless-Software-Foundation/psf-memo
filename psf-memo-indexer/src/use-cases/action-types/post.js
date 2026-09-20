import { utf8FromPush, logProcessError, normalizeTwoPushMemoDatas, postHeightKey, addrPostHeightKey } from './helpers.js'
import { MAX_POST_SIZE } from '../../lib/memo-codes.js'
import { recordProfileRecency } from './profile-recency.js'

// Create a record only when it does not already exist (idempotent writes).
async function createIfMissing (db, key, value) {
  try {
    await db.get(key)
  } catch (err) {
    await db.create(key, value)
  }
}

// Only top-level posts and topic messages qualify for profile recency. Replies
// reuse handlePost to store their post record but must not move the author's
// recency.
function qualifiesForRecency (decoded) {
  return decoded.action === 'post' || decoded.action === 'topicMessage'
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

  if (qualifiesForRecency(decoded)) {
    await recordProfileRecency(adapters, signerAddr, blockHeight, seen)
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-20T22:02:16.774Z","module_hash":"20468da5cbcbef84fea21769827508bd962fa39aaec7de52705b6f35def32191","functions":[{"id":"func/createIfMissing","name":"createIfMissing","line":6,"end_line":12,"hash":"d59cefaf87075a2bc41538961b609387e35393d4fbf02ecfc0633026bbfdca42"},{"id":"func/qualifiesForRecency","name":"qualifiesForRecency","line":17,"end_line":19,"hash":"865f41dcba571b02183d6bac2b8bdfbc0d43c444eb2fadc68b7aa35e0bb4b7fd"},{"id":"func/handlePost","name":"handlePost","line":21,"end_line":50,"hash":"8eae8f0e6003b114b4b043aa298d57ab6562095c74ead3589d503af3c0e82314"}]}
// mutate4javascript-manifest-end
