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

// Keep the newest confirmed qualifying post per address.
export async function backfillProfileRecency ({
  profilesDb,
  postsDb,
  addrPostHeightsDb,
  postParentsDb,
  pollsDb,
  statusDb,
  profileRecencyDb
}) {
  const chainBlockHeight = await readChainBlockHeight(statusDb)
  const best = new Map()

  for await (const [key, value] of addrPostHeightsDb.iterator()) {
    const fallback = partsFromAddrPostHeightKey(key)
    const addr = value?.addr ?? fallback.addr
    const txid = value?.txid ?? fallback.txid
    const blockHeight = value?.blockHeight ?? fallback.blockHeight
    if (!addr || !txid) continue
    if (chainBlockHeight !== null && blockHeight > chainBlockHeight) continue
    if (await getRecord(postParentsDb, txid)) continue
    if (await getRecord(pollsDb, txid)) continue
    if (!(await getRecord(profilesDb, addr))) continue

    const post = await getRecord(postsDb, txid)
    const seen = post?.seen ?? 0
    const current = best.get(addr)
    if (!current || blockHeight > current.blockHeight || (blockHeight === current.blockHeight && seen > current.seen)) {
      best.set(addr, { addr, blockHeight, seen })
    }
  }

  for (const record of best.values()) {
    await profileRecencyDb.put(record.addr, record)
  }

  const desired = new Set(best.keys())
  const stale = []
  for await (const [key] of profileRecencyDb.iterator()) {
    if (!desired.has(key)) stale.push(key)
  }
  for (const key of stale) {
    await profileRecencyDb.del(key)
  }

  return { profiles: best.size }
}
