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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-18T17:31:18.968Z","module_hash":"563df8124fbda3c6f6315fd21eba3f8803ec21ed2478a091dbe8e2d604e2ee79","functions":[{"id":"func/handleFollow","name":"handleFollow","line":4,"end_line":38,"hash":"8aafdee7c2131fda4f783ad131c98c7c0a5265606a6730baa7786c7c0450121a"}]}
// mutate4javascript-manifest-end
