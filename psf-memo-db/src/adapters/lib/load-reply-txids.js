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
