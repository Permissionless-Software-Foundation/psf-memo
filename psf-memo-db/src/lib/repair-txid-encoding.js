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

// Repair one referencing store in place. Every record whose reference can be
// corrected is rewritten; an optional secondary index rebuilds its entry for
// each corrected record. Returns the number of records corrected.
async function repairStore ({ sourceDb, referenceField, targetDb, index }) {
  let correctedCount = 0

  for await (const [recordTxid, record] of sourceDb.iterator()) {
    const reference = record[referenceField]
    if (!reference) continue

    const corrected = await correctReference(targetDb, reference)
    if (corrected === reference) continue

    await sourceDb.put(recordTxid, { ...record, [referenceField]: corrected })

    if (index) {
      await index.db.del(index.key(reference, recordTxid))
      await index.db.put(index.key(corrected, recordTxid), index.value(record, corrected, recordTxid))
    }

    correctedCount++
  }

  return correctedCount
}

// A secondary index keyed as <target txid>:<record txid>; both the postLikes
// and postChildren indexes use this shape.
function txidIndex (db, value) {
  return {
    db,
    key: (targetTxid, recordTxid) => `${targetTxid}:${recordTxid}`,
    value
  }
}

// Repair likes, replies, poll options, and poll votes in place. Returns a
// summary of how many records of each kind were corrected.
export async function repairTxidEncoding (level) {
  const likes = await repairStore({
    sourceDb: level.likesDb,
    referenceField: 'postTxid',
    targetDb: level.postsDb,
    index: txidIndex(level.postLikesDb, (record, postTxid, likeTxid) => ({ postTxid, txid: likeTxid }))
  })

  const replies = await repairStore({
    sourceDb: level.postParentsDb,
    referenceField: 'parentTxid',
    targetDb: level.postsDb,
    index: txidIndex(level.postChildrenDb, (record, parentTxid) => ({ ...record, parentTxid }))
  })

  const pollOptions = await repairStore({
    sourceDb: level.pollOptionsDb,
    referenceField: 'pollTxid',
    targetDb: level.pollsDb
  })

  const pollVotes = await repairStore({
    sourceDb: level.pollVotesDb,
    referenceField: 'pollTxid',
    targetDb: level.pollsDb
  })

  return { likes, replies, pollOptions, pollVotes }
}
