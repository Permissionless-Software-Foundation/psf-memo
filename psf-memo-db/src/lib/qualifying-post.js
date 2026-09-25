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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-25T17:11:28.175Z","module_hash":"22530cdb2b29b93c46d04841bcd4e9efc927d2e262612f563099038b49c7d8bc","functions":[{"id":"func/isNotFound","name":"isNotFound","line":15,"end_line":17,"hash":"3a97ac721c26cf8c2e1edae456afe59263be988cee566a87758f2cb013d8691c"},{"id":"func/getRecord","name":"getRecord","line":20,"end_line":28,"hash":"948bd0435cdce8acf433dbe3aebb9ede9929e6598610a888ec8443947e4cb5a8"},{"id":"func/readChainBlockHeight","name":"readChainBlockHeight","line":32,"end_line":35,"hash":"342991c6aa4dddf98ba8e8854f631a01a46d2f7bd4173ff78e9c601d75351f37"},{"id":"func/partsFromAddrPostHeightKey","name":"partsFromAddrPostHeightKey","line":40,"end_line":51,"hash":"1d48cbd481a5e21704ae4e352190c809b8620ee6c51c74eca4e41e2d25407afb"},{"id":"func/entryFields","name":"entryFields","line":55,"end_line":62,"hash":"a71641df77abbd4c553532b42f5fbf4cec4fd09ff809bc8b2264a1f91fcd050e"},{"id":"func/isConfirmedEntry","name":"isConfirmedEntry","line":66,"end_line":69,"hash":"e3d1fffa4b2ad3fcff3437d09f5ff1e9596ad921d60260db19385a2b3111fac2"},{"id":"func/isQualifyingPost","name":"isQualifyingPost","line":73,"end_line":77,"hash":"4f9ef85596b740471b4919e415d961312388c1dc82947dcc0491698629d45ed9"},{"id":"func/qualifyingCandidate","name":"qualifyingCandidate","line":81,"end_line":88,"hash":"b6b91549d2c06afbc74da70473e0a702f9c7f132f9e67890a42c0b8729e43e6b"},{"id":"func/isNewer","name":"isNewer","line":92,"end_line":96,"hash":"60db8ecaa7d252fb34515a16e4aa8388df6a4e2a0965425ec4c49df49cf0c32a"},{"id":"func/keepNewest","name":"keepNewest","line":100,"end_line":102,"hash":"17fd4a511b90bf952058a2ccf645b1f29fa68134aee1d4590bf7c375409fcfb3"},{"id":"func/addrRange","name":"addrRange","line":104,"end_line":106,"hash":"811f080b19b327429def27f7eada33235edcbf783621097c0e85021f0123449a"},{"id":"func/findNewestQualifyingPost","name":"findNewestQualifyingPost","line":110,"end_line":119,"hash":"09307a5723bf6e3c3a828e77e89ab3a42f341cfa57c991d2f03d09d294e6d42b"}]}
// mutate4javascript-manifest-end
