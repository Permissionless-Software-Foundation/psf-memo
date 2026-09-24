/*
  Resolve a token's IPFS mutable-data record.

  The /slp-tokens page loads a token's mutable data by fetching its token data
  (getTokenData), reading the IPFS mutable-data URI, and asking the wallet to
  resolve that CID to JSON (cid2json). The JSON record carries the tokenIcon
  and fullSizedUrl used to choose the token's icon image. This module owns that
  shared resolution so the /slp-tokens page and the profile token icon row
  agree on how mutable data is fetched and which field wins.
*/

const IPFS_PREFIX = 'ipfs://'

// The CID part of a mutable-data URI, or the value unchanged when it is not an
// ipfs:// URI. Non-strings have no CID.
function parseMutableDataCid (mutableData) {
  if (typeof mutableData !== 'string') return null
  if (mutableData.includes(IPFS_PREFIX)) return mutableData.split(IPFS_PREFIX)[1]
  return mutableData
}

// The icon URL from a resolved mutable-data record: an http fullSizedUrl wins
// over the tokenIcon. Anything else falls back to a jdenticon (null).
function tokenIconFromMutableData (mutableData) {
  if (!mutableData || typeof mutableData !== 'object') return null
  if (typeof mutableData.fullSizedUrl === 'string' && mutableData.fullSizedUrl.includes('http')) {
    return mutableData.fullSizedUrl
  }
  return mutableData.tokenIcon || null
}

// Resolve one mutable-data value to its JSON record through the wallet. A
// value that is already a record is returned as-is; an ipfs:// URI (or bare
// CID) is resolved with cid2json. Returns null when the wallet cannot resolve
// it or the value carries no usable CID.
async function resolveMutableDataRecord (wallet, mutableData) {
  if (typeof mutableData === 'object') return mutableData
  if (typeof wallet.cid2json !== 'function') return null

  const cid = parseMutableDataCid(mutableData)
  if (!cid) return null

  const resolved = await wallet.cid2json({ cid })
  return (resolved && resolved.json) || null
}

// Resolve a token's mutable-data record through the wallet, the same way the
// /slp-tokens page does. Returns the resolved JSON record, or null when the
// token has no mutable data.
async function resolveTokenMutableData (wallet, tokenId) {
  const tokenData = await wallet.getTokenData(tokenId)
  const mutableData = tokenData && tokenData.mutableData
  if (!mutableData) return null
  return resolveMutableDataRecord(wallet, mutableData)
}

module.exports = {
  IPFS_PREFIX,
  parseMutableDataCid,
  tokenIconFromMutableData,
  resolveTokenMutableData
}
