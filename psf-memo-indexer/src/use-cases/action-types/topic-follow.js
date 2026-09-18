import { utf8FromPush, logProcessError } from './helpers.js'
import { PREFIX_TOPIC_UNFOLLOW } from '../../lib/memo-codes.js'
import { recordTopicFollow } from './topic-indexing.js'

export async function handleTopicFollow (ctx) {
  const { adapters, txid, signerAddr, decoded, seen, blockHeight } = ctx
  const { pushDatas, prefix } = decoded

  if (pushDatas.length !== 2) {
    await logProcessError(adapters, txid, `invalid topic follow push data count ${pushDatas.length}`, blockHeight)
    return
  }

  const room = utf8FromPush(pushDatas[1])
  const unfollow = prefix[1] === PREFIX_TOPIC_UNFOLLOW[1]

  await recordTopicFollow(adapters, {
    room,
    addr: signerAddr,
    unfollow,
    txid,
    seen,
    type: 'follow',
    blockHeight
  })
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-18T13:05:43.531Z","module_hash":"365e587ffaac43d371c7d389cb00a00cc7d0e0eee37130a001f8b40daba856ec","functions":[{"id":"func/handleTopicFollow","name":"handleTopicFollow","line":5,"end_line":26,"hash":"b2ce7138ed40e5c618d55fad85b2324861330efb66b150fb7ed296a46de3abfc"}]}
// mutate4javascript-manifest-end
