/*
  Library to build the profileRecency index from an existing psf-memo-db.

  profileRecency holds one record per profile address that has at least one
  confirmed qualifying post, keyed by address, value `{ addr, blockHeight,
  seen }`. The read side uses it to serve GET /profile/recent ordered by the
  most recent post without scanning addrPostHeights itself.

  A qualifying post is a top-level post (0x6d02) or a topic message (0x6d0c).
  Replies (0x6d03) live in postParents and poll creations (0x6d10) live in
  polls, so both are excluded. The newest confirmed qualifying post wins, with
  seen as the tie-breaker. The qualifying-post rules live in
  `qualifying-post.js` so this backfill and the newest-qualifying-post read API
  share them. Unlike the single-address read, the backfill only projects
  addresses that also have a profile record.

  The backfill rebuilds the whole index from addrPostHeights, is idempotent,
  and removes stale records for addresses that no longer qualify. The LevelDB
  handles are injected so the logic stays testable and free of file-system
  concerns; the CLI wrapper in util/profiles opens the real stores.
*/

import {
  getRecord,
  readChainBlockHeight,
  qualifyingCandidate,
  keepNewest
} from './qualifying-post.js'

// Keep the newest candidate per profile address. Addresses without a profile
// record are not part of the recent-profile read path and are skipped.
async function collectBestRecency (stores, chainBlockHeight) {
  const best = new Map()
  for await (const [key, value] of stores.addrPostHeightsDb.iterator()) {
    const candidate = await qualifyingCandidate(stores, key, value, chainBlockHeight)
    if (!candidate) continue
    if (!(await getRecord(stores.profilesDb, candidate.addr))) continue
    keepNewest(best, candidate)
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
// {"version":1,"tested_at":"2026-09-25T17:13:42.943Z","module_hash":"38d222a542282a83e8302e5c444097b40bd9054236d47d66d3098db84134d33f","functions":[{"id":"func/collectBestRecency","name":"collectBestRecency","line":32,"end_line":41,"hash":"5c153f47121abb95e0932715418e033cacd20342e205c8b4213897e5c5cbd79a"},{"id":"func/writeRecency","name":"writeRecency","line":43,"end_line":47,"hash":"35ad5339afbd58f4df16ec5bc400b7a3e6e8136fc0d726dd6368a8be54d34b57"},{"id":"func/removeStaleRecency","name":"removeStaleRecency","line":49,"end_line":53,"hash":"494b04d530f09bc1ad5ff09c4b0b3cfe6a98366e4e4c21395f9df45bedb61f63"},{"id":"func/backfillProfileRecency","name":"backfillProfileRecency","line":58,"end_line":64,"hash":"a737e754befdc198a62ec6e6392e80ed4cde419019c9f04492212f971db42428"}]}
// mutate4javascript-manifest-end
