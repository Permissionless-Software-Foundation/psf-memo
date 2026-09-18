import { logProcessError, followeeHeightKey } from './helpers.js'
import { PK_HASH_LENGTH, PREFIX_UNFOLLOW } from '../../lib/memo-codes.js'

export async function handleFollow (ctx) {
  const { adapters, txid, signerAddr, decoded, seen, blockHeight } = ctx
  const { pushDatas, prefix } = decoded

  if (pushDatas.length !== 2) {
    await logProcessError(adapters, txid, `invalid follow push data count ${pushDatas.length}`, blockHeight)
    return
  }

  if (pushDatas[1].length !== PK_HASH_LENGTH) {
    await logProcessError(adapters, txid, 'follow pk hash wrong size', blockHeight)
    return
  }

  const unfollow = prefix[1] === PREFIX_UNFOLLOW[1]
  const followeePkHash = pushDatas[1].toString('hex')

  const key = `${signerAddr}:${followeePkHash}`
  const record = {
    followerAddr: signerAddr,
    followeePkHash,
    unfollow,
    txid,
    seen,
    blockHeight
  }
  await adapters.followDb.create(key, record)

  // Mirror the event into the followeeHeights notification index so the read
  // side can find the viewer's follows without scanning the follows store.
  await adapters.followeeHeightDb.create(
    followeeHeightKey(followeePkHash, blockHeight, signerAddr),
    record
  )
}
