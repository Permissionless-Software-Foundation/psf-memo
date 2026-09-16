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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-16T22:08:39.973Z","module_hash":"503f8556da96560869090037a52d4e6f25755c56115514d69000bb766c3a34b1","functions":[{"id":"func/reverseTxid","name":"reverseTxid","line":20,"end_line":23,"hash":"34ca3f58033b0a4e34f613eca6dbb92874930d818b4258dd1fc3983dc60f5c59"},{"id":"func/hasRecord","name":"hasRecord","line":26,"end_line":34,"hash":"06580e61d91df680470d1702724aa084dad7f830a3d4be251d4bed430c893008"},{"id":"func/correctReference","name":"correctReference","line":39,"end_line":44,"hash":"d21e349238201c186d0c1216290e1c3bc4c357e42cd1bbe12273ae691f33ff32"},{"id":"func/repairStore","name":"repairStore","line":49,"end_line":70,"hash":"4a03f168d7c9ee3bbcd2dced4cca2903ef27b3d1b5616e77ff8b92302e275ab8"},{"id":"func/txidIndex","name":"txidIndex","line":74,"end_line":80,"hash":"2193de97502a9d50cef2cd9077a29a2bd141562b4a52b6f2b234c16f42e98606"},{"id":"func/repairTxidEncoding","name":"repairTxidEncoding","line":84,"end_line":112,"hash":"b1a18916b2681e83b59b1b14e1727a46d6780f47b8efdcd5b7726d2452a89467"}]}
// mutate4javascript-manifest-end
