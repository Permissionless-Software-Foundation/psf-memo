/*
  Library to build the profileRecency index from an existing psf-memo-db.

  profileRecency holds one record per profile address that has at least one
  confirmed qualifying post, keyed by address, value `{ addr, blockHeight,
  seen }`. The read side uses it to serve GET /profile/recent ordered by the
  most recent post without scanning addrPostHeights itself.

  A qualifying post is a top-level post (0x6d02) or a topic message (0x6d0c).
  Replies (0x6d03) live in postParents and poll creations (0x6d10) live in
  polls, so both are excluded. Only addresses that also have a profile record
  qualify. Entries above status.chainBlockHeight are unconfirmed and ignored.
  The newest confirmed qualifying post wins, with seen as the tie-breaker.

  The backfill rebuilds the whole index from addrPostHeights, is idempotent,
  and removes stale records for addresses that no longer qualify. The LevelDB
  handles are injected so the logic stays testable and free of file-system
  concerns; the CLI wrapper in util/profiles opens the real stores.
*/

function isNotFound (err) {
  return Boolean(err && (err.notFound || err.code === 'LEVEL_NOT_FOUND'))
}

// Read a record, or null when it is absent. Rethrows real errors.
async function getRecord (db, key) {
  if (!db) return null
  try {
    return await db.get(key)
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

// The status store holds the indexer tip. A missing store or record means we
// cannot prove any entry is unconfirmed, so the backfill keeps every entry.
async function readChainBlockHeight (statusDb) {
  const status = await getRecord(statusDb, 'status')
  return typeof status?.chainBlockHeight === 'number' ? status.chainBlockHeight : null
}

// Recover the address, block height, and txid from an addrPostHeights key of
// the form `${addr}:${paddedHeight}:${txid}`. Cash addresses contain colons, so
// the height and txid are the final two segments.
export function partsFromAddrPostHeightKey (key) {
  const str = String(key)
  const txidColon = str.lastIndexOf(':')
  const txid = str.slice(txidColon + 1)
  const beforeTxid = str.slice(0, txidColon)
  const heightColon = beforeTxid.lastIndexOf(':')
  return {
    addr: beforeTxid.slice(0, heightColon),
    blockHeight: parseInt(beforeTxid.slice(heightColon + 1), 10) || 0,
    txid
  }
}

// Prefer the stored value fields, falling back to the key segments when a
// record predates the field being written.
function entryFields (key, value) {
  const fallback = partsFromAddrPostHeightKey(key)
  return {
    addr: value?.addr ?? fallback.addr,
    txid: value?.txid ?? fallback.txid,
    blockHeight: value?.blockHeight ?? fallback.blockHeight
  }
}

// An entry at or below the chain tip is confirmed. With no tip every entry is
// treated as confirmed.
function isConfirmedEntry (blockHeight, chainBlockHeight) {
  if (chainBlockHeight === null) return true
  return blockHeight <= chainBlockHeight
}

// A qualifying post is authored by a profile address and is neither a reply
// (tracked in postParents) nor a poll creation (tracked in polls).
async function isQualifyingPost (stores, addr, txid) {
  if (!(await getRecord(stores.profilesDb, addr))) return false
  if (await getRecord(stores.postParentsDb, txid)) return false
  if (await getRecord(stores.pollsDb, txid)) return false
  return true
}

// The qualifying post for one addrPostHeights entry, or null when the entry
// does not qualify.
async function qualifyingCandidate (stores, key, value, chainBlockHeight) {
  const { addr, txid, blockHeight } = entryFields(key, value)
  if (!addr || !txid) return null
  if (!isConfirmedEntry(blockHeight, chainBlockHeight)) return null
  if (!(await isQualifyingPost(stores, addr, txid))) return null
  const post = await getRecord(stores.postsDb, txid)
  return { addr, blockHeight, seen: post?.seen ?? 0 }
}

// True when `candidate` is newer than `current`: greater height, or equal
// height with a greater seen value.
function isNewer (candidate, current) {
  if (!current) return true
  if (candidate.blockHeight !== current.blockHeight) return candidate.blockHeight > current.blockHeight
  return candidate.seen > current.seen
}

// Keep the newest candidate per address. Equal height and seen keeps the first
// record seen, which makes reprocessing idempotent.
function keepNewest (best, candidate) {
  if (isNewer(candidate, best.get(candidate.addr))) best.set(candidate.addr, candidate)
}

async function collectBestRecency (stores, chainBlockHeight) {
  const best = new Map()
  for await (const [key, value] of stores.addrPostHeightsDb.iterator()) {
    const candidate = await qualifyingCandidate(stores, key, value, chainBlockHeight)
    if (candidate) keepNewest(best, candidate)
  }
  return best
}

async function writeRecency (profileRecencyDb, best) {
  for (const record of best.values()) {
    await profileRecencyDb.put(record.addr, record)
  }
}

async function removeStaleRecency (profileRecencyDb, desired) {
  for await (const [key] of profileRecencyDb.iterator()) {
    if (!desired.has(key)) await profileRecencyDb.del(key)
  }
}

// Rebuild the whole index: collect the newest confirmed qualifying post per
// profile address, write those records, and drop records that no longer
// qualify.
export async function backfillProfileRecency (stores) {
  const chainBlockHeight = await readChainBlockHeight(stores.statusDb)
  const best = await collectBestRecency(stores, chainBlockHeight)
  await writeRecency(stores.profileRecencyDb, best)
  await removeStaleRecency(stores.profileRecencyDb, new Set(best.keys()))
  return { profiles: best.size }
}
