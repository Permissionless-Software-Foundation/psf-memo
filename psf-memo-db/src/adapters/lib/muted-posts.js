/*
  Shared helpers for applying mute filtering across query adapters.

  Several adapters exclude content authored by addresses the viewer currently
  mutes. Centralizing the mute-set lookup and the muted-membership check keeps
  behavior identical across adapters and removes duplication.
*/

// Return a Set of addresses muted by viewerAddr, or an empty set when no mute
// query adapter or viewer address is available.
export async function loadMutedAddrs (muteQuery, viewerAddr) {
  if (!muteQuery || !viewerAddr) return new Set()
  const muted = await muteQuery.listMuted(viewerAddr)
  return new Set(muted)
}

// True when the post for txid is authored by an address in mutedAddrs. Missing
// posts are treated as not muted. `getPost` resolves to the post record or null.
export async function isMutedPost (getPost, txid, mutedAddrs) {
  if (mutedAddrs.size === 0) return false
  const post = await getPost(txid)
  if (!post) return false
  return mutedAddrs.has(post.addr)
}
