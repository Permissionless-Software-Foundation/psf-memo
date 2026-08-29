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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-29T03:33:07.635Z","module_hash":"7bf93c17bf9870e22376fae9d8c7748f66d74851ccd64a0e9799a7a246a0d809","functions":[{"id":"func/handleMute","name":"handleMute","line":4,"end_line":30,"hash":"fa1dfbff1aa2f2d09fb6ff6eb2cf391ae281d038876ae1d3602a25dfa2946fa3"}]}
// mutate4javascript-manifest-end
