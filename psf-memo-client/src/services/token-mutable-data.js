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

// Resolve a token's genesis name and mutable-data record through the wallet,
// the same way the /slp-tokens page does. Returns { name, mutableData } (each
// may be null), or null when the wallet has no token data for the id.
async function resolveTokenData (wallet, tokenId) {
  const tokenData = await wallet.getTokenData(tokenId)
  if (!tokenData) return null

  const name = (tokenData.genesisData && tokenData.genesisData.name) || null
  const mutableData = tokenData.mutableData
    ? await resolveMutableDataRecord(wallet, tokenData.mutableData)
    : null
  return { name, mutableData }
}

// Resolve a token's mutable-data record through the wallet, the same way the
// /slp-tokens page does. Returns the resolved JSON record, or null when the
// token has no mutable data.
async function resolveTokenMutableData (wallet, tokenId) {
  const tokenData = await resolveTokenData(wallet, tokenId)
  return tokenData ? tokenData.mutableData : null
}

module.exports = {
  IPFS_PREFIX,
  parseMutableDataCid,
  tokenIconFromMutableData,
  resolveTokenData,
  resolveTokenMutableData
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-24T02:40:01.719Z","module_hash":"39dad441b49f858c1aa8c6ef66bd9d7c2d8fe70c73ad893ce903a51be3f7d1ae","functions":[{"id":"func/parseMutableDataCid","name":"parseMutableDataCid","line":16,"end_line":20,"hash":"d86ac0e0a6e672e6f7075d31ed895e3b424ecb5dcf8a39f4a9ceb947ceb83103"},{"id":"func/tokenIconFromMutableData","name":"tokenIconFromMutableData","line":24,"end_line":30,"hash":"d66ca17720934a299d8f48b4caa970ddac744521f04bfa3cc676f0e7a13610a8"},{"id":"func/resolveMutableDataRecord","name":"resolveMutableDataRecord","line":36,"end_line":45,"hash":"0611674972e0d530b46d22f386348674c53771efeccc2e42c109020e786d4c2d"},{"id":"func/resolveTokenData","name":"resolveTokenData","line":50,"end_line":59,"hash":"1a7cb83fe89a90c5f943a15432db5bb630709dd0c2723095ac5b3948f6d5c313"},{"id":"func/resolveTokenMutableData","name":"resolveTokenMutableData","line":64,"end_line":67,"hash":"a923d07791297d90e189bfd9c997778e241d26f55f5b8867777313190536add9"}]}
// mutate4javascript-manifest-end
