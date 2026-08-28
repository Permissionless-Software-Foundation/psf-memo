import { utf8FromPush, logProcessError, txHashFromPush } from './helpers.js'
import { TX_HASH_LENGTH } from '../../lib/memo-codes.js'

export async function handlePollVote (ctx) {
  const { adapters, txid, signerAddr, decoded, seen, blockHeight } = ctx
  const { pushDatas } = decoded

  if (pushDatas.length !== 3) {
    await logProcessError(adapters, txid, `invalid poll-vote push data count ${pushDatas.length}`, blockHeight)
    return
  }

  if (pushDatas[1].length !== TX_HASH_LENGTH) {
    await logProcessError(adapters, txid, 'poll-vote poll tx hash wrong size', blockHeight)
    return
  }

  const pollTxid = txHashFromPush(pushDatas[1])
  const comment = utf8FromPush(pushDatas[2])

  if (!comment.length) {
    await logProcessError(adapters, txid, 'empty poll vote comment', blockHeight)
    return
  }

  const voteData = {
    addr: signerAddr,
    pollTxid,
    comment,
    seen,
    blockHeight
  }

  await adapters.pollVoteDb.create(txid, voteData)
}
