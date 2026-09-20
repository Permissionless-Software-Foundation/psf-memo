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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-20T22:14:18.244Z","module_hash":"c6da57d385443b5883d925cdce874fb67ebbc1d4eecd78446dd992b538d7ce6c","functions":[{"id":"func/isNotFound","name":"isNotFound","line":21,"end_line":23,"hash":"3a97ac721c26cf8c2e1edae456afe59263be988cee566a87758f2cb013d8691c"},{"id":"func/getRecord","name":"getRecord","line":26,"end_line":34,"hash":"948bd0435cdce8acf433dbe3aebb9ede9929e6598610a888ec8443947e4cb5a8"},{"id":"func/readChainBlockHeight","name":"readChainBlockHeight","line":38,"end_line":41,"hash":"342991c6aa4dddf98ba8e8854f631a01a46d2f7bd4173ff78e9c601d75351f37"},{"id":"func/partsFromAddrPostHeightKey","name":"partsFromAddrPostHeightKey","line":46,"end_line":57,"hash":"1d48cbd481a5e21704ae4e352190c809b8620ee6c51c74eca4e41e2d25407afb"},{"id":"func/entryFields","name":"entryFields","line":61,"end_line":68,"hash":"a71641df77abbd4c553532b42f5fbf4cec4fd09ff809bc8b2264a1f91fcd050e"},{"id":"func/isConfirmedEntry","name":"isConfirmedEntry","line":72,"end_line":75,"hash":"e3d1fffa4b2ad3fcff3437d09f5ff1e9596ad921d60260db19385a2b3111fac2"},{"id":"func/isQualifyingPost","name":"isQualifyingPost","line":79,"end_line":84,"hash":"d58b96768f927594592576fde274d9a5f69d54df1b73184ecc38a5735ca5e252"},{"id":"func/qualifyingCandidate","name":"qualifyingCandidate","line":88,"end_line":95,"hash":"ec80fdecd67123dc9cb95f351933e6777b44b21b160cdc2d8e7cb0d8b9f9f072"},{"id":"func/isNewer","name":"isNewer","line":99,"end_line":103,"hash":"60db8ecaa7d252fb34515a16e4aa8388df6a4e2a0965425ec4c49df49cf0c32a"},{"id":"func/keepNewest","name":"keepNewest","line":107,"end_line":109,"hash":"17fd4a511b90bf952058a2ccf645b1f29fa68134aee1d4590bf7c375409fcfb3"},{"id":"func/collectBestRecency","name":"collectBestRecency","line":111,"end_line":118,"hash":"19618f9ad24d6b1740f1765d952a1b65cbc062319962051264193d24913349a1"},{"id":"func/writeRecency","name":"writeRecency","line":120,"end_line":124,"hash":"35ad5339afbd58f4df16ec5bc400b7a3e6e8136fc0d726dd6368a8be54d34b57"},{"id":"func/removeStaleRecency","name":"removeStaleRecency","line":126,"end_line":130,"hash":"494b04d530f09bc1ad5ff09c4b0b3cfe6a98366e4e4c21395f9df45bedb61f63"},{"id":"func/backfillProfileRecency","name":"backfillProfileRecency","line":135,"end_line":141,"hash":"a737e754befdc198a62ec6e6392e80ed4cde419019c9f04492212f971db42428"}]}
// mutate4javascript-manifest-end
