/*
  Library to repair byte-reversed txid references in a psf-memo-db.

  Older psf-memo-client broadcasts embedded a referenced txid in big-endian
  display order. The indexer expected little-endian wire order, so it reversed
  those bytes and stored a reference that is the reverse of the display txid.
  This library rewrites a reversed reference to display order and rebuilds the
  affected secondary index.

  It leaves records whose reference already points at a known target
  untouched, leaves references whose target is unknown in either byte order
  untouched, and is idempotent: a second run makes no changes.

  The LevelDB handles are injected so the repair logic stays testable and free
  of file-system concerns; the CLI wrapper in util/txid opens the real stores.
*/

// Reverse the byte order of a 64-character display txid. Returns null for any
// value that is not a 64-character hex txid.
export function reverseTxid (txid) {
  if (typeof txid !== 'string' || !/^[0-9a-fA-F]{64}$/.test(txid)) return null
  return Buffer.from(txid, 'hex').reverse().toString('hex')
}

// True when a store has a record at the given key.
async function hasRecord (db, key) {
  try {
    await db.get(key)
    return true
  } catch (err) {
    if (err.notFound || err.code === 'LEVEL_NOT_FOUND') return false
    throw err
  }
}

// Choose the reference in display order. Keep the stored reference when its
// target exists. Otherwise use the reversed reference when that target
// exists. Otherwise return the stored reference unchanged.
export async function correctReference (targetDb, reference) {
  if (await hasRecord(targetDb, reference)) return reference
  const reversed = reverseTxid(reference)
  if (reversed && await hasRecord(targetDb, reversed)) return reversed
  return reference
}

// Repair likes, replies, poll options, and poll votes in place. Returns a
// summary of how many records of each kind were corrected.
export async function repairTxidEncoding (level) {
  const summary = { likes: 0, replies: 0, pollOptions: 0, pollVotes: 0 }

  for await (const [likeTxid, like] of level.likesDb.iterator()) {
    if (!like.postTxid) continue
    const corrected = await correctReference(level.postsDb, like.postTxid)
    if (corrected === like.postTxid) continue

    await level.likesDb.put(likeTxid, { ...like, postTxid: corrected })
    await level.postLikesDb.del(`${like.postTxid}:${likeTxid}`)
    await level.postLikesDb.put(`${corrected}:${likeTxid}`, { postTxid: corrected, txid: likeTxid })
    summary.likes++
  }

  for await (const [replyTxid, reply] of level.postParentsDb.iterator()) {
    if (!reply.parentTxid) continue
    const corrected = await correctReference(level.postsDb, reply.parentTxid)
    if (corrected === reply.parentTxid) continue

    await level.postParentsDb.put(replyTxid, { ...reply, parentTxid: corrected })
    await level.postChildrenDb.del(`${reply.parentTxid}:${replyTxid}`)
    await level.postChildrenDb.put(`${corrected}:${replyTxid}`, { ...reply, parentTxid: corrected })
    summary.replies++
  }

  for await (const [optionTxid, option] of level.pollOptionsDb.iterator()) {
    if (!option.pollTxid) continue
    const corrected = await correctReference(level.pollsDb, option.pollTxid)
    if (corrected === option.pollTxid) continue

    await level.pollOptionsDb.put(optionTxid, { ...option, pollTxid: corrected })
    summary.pollOptions++
  }

  for await (const [voteTxid, vote] of level.pollVotesDb.iterator()) {
    if (!vote.pollTxid) continue
    const corrected = await correctReference(level.pollsDb, vote.pollTxid)
    if (corrected === vote.pollTxid) continue

    await level.pollVotesDb.put(voteTxid, { ...vote, pollTxid: corrected })
    summary.pollVotes++
  }

  return summary
}
