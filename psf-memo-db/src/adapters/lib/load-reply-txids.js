/*
  Shared helper to collect the set of child txids that are replies.

  Both the post query and search query adapters need to know which posts are
  replies so they can exclude them from top-level listings. Centralizing the
  scan keeps reply-detection behavior identical across adapters.
*/

export async function loadReplyTxids (postParentsDb) {
  const replyTxids = new Set()

  for await (const [childTxid] of postParentsDb.iterator()) {
    replyTxids.add(childTxid)
  }

  return replyTxids
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-29T15:18:40.417Z","module_hash":"4024492a889a87fa3669b0daf955e2a906c75407b2b1f83008458710f1206c9e","functions":[{"id":"func/loadReplyTxids","name":"loadReplyTxids","line":9,"end_line":17,"hash":"17ac31205b8d5e508bda758939bcde282f79add47236c27de07402654ae0b2df"}]}
// mutate4javascript-manifest-end
