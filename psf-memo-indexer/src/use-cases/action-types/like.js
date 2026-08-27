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
