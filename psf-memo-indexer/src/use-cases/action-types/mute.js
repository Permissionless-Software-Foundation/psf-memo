import { logProcessError } from './helpers.js'
import { PK_HASH_LENGTH, PREFIX_UNMUTE } from '../../lib/memo-codes.js'

export async function handleMute (ctx) {
  const { adapters, txid, signerAddr, decoded, seen, blockHeight } = ctx
  const { pushDatas, prefix } = decoded

  if (pushDatas.length !== 2) {
    await logProcessError(adapters, txid, `invalid mute push data count ${pushDatas.length}`, blockHeight)
    return
  }

  if (pushDatas[1].length !== PK_HASH_LENGTH) {
    await logProcessError(adapters, txid, 'mute pk hash wrong size', blockHeight)
    return
  }

  const unmute = prefix[1] === PREFIX_UNMUTE[1]
  const muteePkHash = pushDatas[1].toString('hex')

  const key = `${signerAddr}:${muteePkHash}`
  await adapters.muteDb.create(key, {
    muterAddr: signerAddr,
    muteePkHash,
    unmute,
    txid,
    seen,
    blockHeight
  })
}
