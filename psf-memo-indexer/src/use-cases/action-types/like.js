import { txHashFromPush, logProcessError, postLikeKey } from './helpers.js'
import { TX_HASH_LENGTH } from '../../lib/memo-codes.js'

// True when a vout pays the first address to the given address.
function isPaymentTo (vout, addr) {
  const addrs = vout.scriptPubKey && vout.scriptPubKey.addresses
  return addrs && addrs[0] === addr
}

// Compute the tip value for a like, in satoshis, when the like is sent to a
// post owned by a different address. Returns 0 when the post is unknown or
// owned by the liker.
export function computeLikeTip (txDetails, post, signerAddr) {
  if (!post || post.addr === signerAddr) return 0

  let tip = 0
  for (const vout of txDetails.vout) {
    if (isPaymentTo(vout, post.addr)) {
      tip += Math.round(vout.value * 1e8)
    }
  }

  return tip
}

export async function handleLike (ctx) {
  const { adapters, txid, signerAddr, decoded, seen, txDetails, blockHeight } = ctx
  const { pushDatas } = decoded

  if (pushDatas.length !== 2) {
    await logProcessError(adapters, txid, `invalid like push data count ${pushDatas.length}`, blockHeight)
    return
  }

  if (pushDatas[1].length !== TX_HASH_LENGTH) {
    await logProcessError(adapters, txid, 'like post tx hash wrong size', blockHeight)
    return
  }

  const postTxid = txHashFromPush(pushDatas[1])

  let post = null
  try {
    post = await adapters.postDb.get(postTxid)
  } catch (err) {
    // post may not exist yet
  }

  const tip = computeLikeTip(txDetails, post, signerAddr)

  const likeData = {
    addr: signerAddr,
    postTxid,
    seen,
    tip,
    blockHeight
  }
  await adapters.likeDb.create(txid, likeData)
  await adapters.postLikeDb.create(postLikeKey(postTxid, txid), { postTxid, txid })
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T03:17:51.436Z","module_hash":"49c10735bf45a2f790741791beb7088e3528e2f7538967452ea0a9e1eb3755ea","functions":[{"id":"func/isPaymentTo","name":"isPaymentTo","line":5,"end_line":8,"hash":"f7b4506a33c69a70ac52b1c98d9fcc5372b6cddf05e112d25c8ca24ef50c860c"},{"id":"func/computeLikeTip","name":"computeLikeTip","line":13,"end_line":24,"hash":"586f4f371d626325e411e43e8364c16622b36ad06f2d6599f8fcdcf5e071c105"},{"id":"func/handleLike","name":"handleLike","line":26,"end_line":60,"hash":"a445c23bfc8eb141a13ddbdb11d34367420a3753c1a29ef38fa6663a628d63ff"}]}
// mutate4javascript-manifest-end
