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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-04T20:03:10.440Z","module_hash":"fcc7f66f78de959a166c5147f0c174e07ab07af04619ffef0a314f97f5f27c90","functions":[{"id":"func/loadMutedAddrs","name":"loadMutedAddrs","line":11,"end_line":15,"hash":"6490e1aa9551309ad7ee5f9498ceea305df865fcce906d9538c10880ad2be357"},{"id":"func/isMutedPost","name":"isMutedPost","line":19,"end_line":24,"hash":"6d8771b15c888ee2cd20d8dcb7217758b68b4fcaeef6ce319f7fb1296ed9f3e2"}]}
// mutate4javascript-manifest-end
