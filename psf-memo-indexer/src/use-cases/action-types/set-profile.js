import { utf8FromPush, logProcessError, normalizeTwoPushMemoDatas } from './helpers.js'
import { MAX_POST_SIZE } from '../../lib/memo-codes.js'
import { establishProfileRecency } from './profile-recency.js'

export async function handleSetProfile (ctx) {
  const { adapters, txid, signerAddr, decoded, seen, blockHeight } = ctx
  const pushDatas = normalizeTwoPushMemoDatas(decoded.pushDatas)

  if (pushDatas.length !== 2) {
    await logProcessError(adapters, txid, `invalid profile push data count ${pushDatas.length}`, blockHeight)
    return
  }

  const text = utf8FromPush(pushDatas[1])
  if (text.length > MAX_POST_SIZE) {
    await logProcessError(adapters, txid, 'profile too large', blockHeight)
    return
  }

  await adapters.profileDb.create(signerAddr, { text, txid, seen, addr: signerAddr, blockHeight })
  await establishProfileRecency(adapters, signerAddr)
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-20T22:12:37.670Z","module_hash":"527293404ff751265c80ca2abf4803b478e5786ad6bc3496616fb846668e4e02","functions":[{"id":"func/handleSetProfile","name":"handleSetProfile","line":5,"end_line":22,"hash":"4df97ed1a92e3d265b499abbb977e91ca80bd100b4d59138d4a3cd0d852fb25b"}]}
// mutate4javascript-manifest-end
