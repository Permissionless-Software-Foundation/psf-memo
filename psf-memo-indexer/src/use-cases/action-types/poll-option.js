import { utf8FromPush, logProcessError, txHashFromPush } from './helpers.js'
import { TX_HASH_LENGTH } from '../../lib/memo-codes.js'

export async function handleAddPollOption (ctx) {
  const { adapters, txid, signerAddr, decoded, seen, blockHeight } = ctx
  const { pushDatas } = decoded

  if (pushDatas.length !== 3) {
    await logProcessError(adapters, txid, `invalid add-poll-option push data count ${pushDatas.length}`, blockHeight)
    return
  }

  if (pushDatas[1].length !== TX_HASH_LENGTH) {
    await logProcessError(adapters, txid, 'add-poll-option poll tx hash wrong size', blockHeight)
    return
  }

  const pollTxid = txHashFromPush(pushDatas[1])
  const option = utf8FromPush(pushDatas[2])

  if (!option.length) {
    await logProcessError(adapters, txid, 'empty poll option', blockHeight)
    return
  }

  const optionData = {
    addr: signerAddr,
    pollTxid,
    option,
    seen,
    blockHeight
  }

  await adapters.pollOptionDb.create(txid, optionData)
}
