/*
  Pure helpers for finding the newest confirmed qualifying post.

  A qualifying post is a top-level post (0x6d02) or a topic message (0x6d0c).
  Replies (tracked in postParents) and poll creations (tracked in polls) do
  not qualify. A post above status.chainBlockHeight is unconfirmed and does not
  qualify. The newest confirmed qualifying post wins, with seen as the
  tie-breaker at equal heights.

  The profileRecency backfill uses these helpers to project every profile, and
  the newest-qualifying-post read API uses them for a single address. Keeping
  the rules in one place makes both paths agree.
*/

export function isNotFound (err) {
  return Boolean(err && (err.notFound || err.code === 'LEVEL_NOT_FOUND'))
}

// Read a record, or null when it is absent. Rethrows real errors.
export async function getRecord (db, key) {
  if (!db) return null
  try {
    return await db.get(key)
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

// The status store holds the indexer tip. A missing store or record means we
// cannot prove any entry is unconfirmed, so every entry counts as confirmed.
export async function readChainBlockHeight (statusDb) {
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
export function entryFields (key, value) {
  const fallback = partsFromAddrPostHeightKey(key)
  return {
    addr: value?.addr ?? fallback.addr,
    txid: value?.txid ?? fallback.txid,
    blockHeight: value?.blockHeight ?? fallback.blockHeight
  }
}

// An entry at or below the chain tip is confirmed. With no tip every entry is
// treated as confirmed.
export function isConfirmedEntry (blockHeight, chainBlockHeight) {
  if (chainBlockHeight === null) return true
  return blockHeight <= chainBlockHeight
}

// A qualifying post is neither a reply (tracked in postParents) nor a poll
// creation (tracked in polls).
export async function isQualifyingPost (stores, txid) {
  if (await getRecord(stores.postParentsDb, txid)) return false
  if (await getRecord(stores.pollsDb, txid)) return false
  return true
}

// The qualifying post for one addrPostHeights entry, or null when the entry
// does not qualify.
export async function qualifyingCandidate (stores, key, value, chainBlockHeight) {
  const { addr, txid, blockHeight } = entryFields(key, value)
  if (!addr || !txid) return null
  if (!isConfirmedEntry(blockHeight, chainBlockHeight)) return null
  if (!(await isQualifyingPost(stores, txid))) return null
  const post = await getRecord(stores.postsDb, txid)
  return { addr, blockHeight, seen: post?.seen ?? 0 }
}

// True when `candidate` is newer than `current`: greater height, or equal
// height with a greater seen value.
export function isNewer (candidate, current) {
  if (!current) return true
  if (candidate.blockHeight !== current.blockHeight) return candidate.blockHeight > current.blockHeight
  return candidate.seen > current.seen
}

// Keep the newest candidate per address. Equal height and seen keeps the first
// record seen, which makes reprocessing idempotent.
export function keepNewest (best, candidate) {
  if (isNewer(candidate, best.get(candidate.addr))) best.set(candidate.addr, candidate)
}

function addrRange (addr) {
  return { gte: `${addr}:`, lte: `${addr}:\uffff` }
}

// The newest confirmed qualifying post for one address, or null when the
// address has none. Scans only the requested address's addrPostHeights range.
export async function findNewestQualifyingPost (stores, addr) {
  const chainBlockHeight = await readChainBlockHeight(stores.statusDb)
  let best = null
  for await (const [key, value] of stores.addrPostHeightsDb.iterator(addrRange(addr))) {
    const candidate = await qualifyingCandidate(stores, key, value, chainBlockHeight)
    if (!candidate || candidate.addr !== addr) continue
    if (isNewer(candidate, best)) best = candidate
  }
  return best
}
