/*
  Maintain the profileRecency index for Memo profile authors.

  profileRecency holds one record per profile address that has at least one
  confirmed qualifying post, keyed by address, value `{ addr, blockHeight,
  seen }`. It lets the read side list profiles by their most recent post
  without scanning addrPostHeights.

  A qualifying post is a top-level post (0x6d02) or a topic message (0x6d0c).
  Replying (0x6d03) and poll creation (0x6d10) do not qualify. Recency is only
  written for addresses that have a set-profile record (0x6d05), and only for
  confirmed blocks (at or below status.chainBlockHeight). Processing posts in
  any order converges on the greatest height, with seen as the tie-breaker, so
  a replay never regresses a profile's recency.

  When a set-profile transaction arrives after the address has already posted,
  the initial recency comes from psf-memo-db's newest-qualifying-post read API
  (the `newestQualifyingPost` adapter). The indexer never scans
  addrPostHeights itself.
*/

import { getIfPresent } from './helpers.js'

// The chain tip bounds confirmation. With no status adapter, or a status
// without a numeric tip, return null so every post counts as confirmed.
async function getChainBlockHeight (adapters) {
  const statusDb = adapters.statusDb
  if (!statusDb) return null
  try {
    const status = await statusDb.getStatus()
    return typeof status?.chainBlockHeight === 'number' ? status.chainBlockHeight : null
  } catch (err) {
    return null
  }
}

// A post is confirmed only when it is at or below the chain tip. A missing
// block height is an unconfirmed (mempool) post.
export function isConfirmed (blockHeight, chainBlockHeight) {
  if (blockHeight === null || blockHeight === undefined) return false
  if (chainBlockHeight === null || chainBlockHeight === undefined) return true
  return blockHeight <= chainBlockHeight
}

// Upsert a profile's recency, keeping the newest height and the newest seen at
// that height. Equal height and seen is a no-op, so reprocessing is idempotent.
async function upsertProfileRecency (adapters, addr, blockHeight, seen) {
  const existing = await getIfPresent(adapters.profileRecencyDb, addr)
  if (existing) {
    const existingHeight = existing.blockHeight ?? 0
    const existingSeen = existing.seen ?? 0
    if (blockHeight < existingHeight) return existing
    if (blockHeight === existingHeight && seen <= existingSeen) return existing
  }

  const record = { addr, blockHeight, seen }
  await adapters.profileRecencyDb.update(addr, record)
  return record
}

// Record a qualifying post for an author that already has a profile. The
// profile lookup keeps the index limited to addresses the recent list shows.
export async function recordProfileRecency (adapters, addr, blockHeight, seen) {
  if (!adapters.profileRecencyDb || !adapters.profileDb) return null
  if (!(await getIfPresent(adapters.profileDb, addr))) return null
  if (!isConfirmed(blockHeight, await getChainBlockHeight(adapters))) return null

  return upsertProfileRecency(adapters, addr, blockHeight ?? 0, seen ?? 0)
}

// Establish a profile's recency from psf-memo-db when a set-profile action
// creates the profile, so a profile set after posting still reports the
// existing newest confirmed qualifying post. The read API applies the
// qualifying and confirmation rules.
export async function establishProfileRecency (adapters, addr) {
  if (!adapters.profileRecencyDb || !adapters.newestQualifyingPost) return null

  const newest = await adapters.newestQualifyingPost.get(addr)
  if (!newest) return null
  return upsertProfileRecency(adapters, addr, newest.blockHeight ?? 0, newest.seen ?? 0)
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-20T22:21:12.817Z","module_hash":"4947b506b19056b74e5fa2b71a56977efc554e460f908123153701dffecb410d","functions":[{"id":"func/getChainBlockHeight","name":"getChainBlockHeight","line":21,"end_line":30,"hash":"496cbdf9c6911013be659fc4faf22c95e0871b989f9efe66cd6802b7c671bbc1"},{"id":"func/isConfirmed","name":"isConfirmed","line":34,"end_line":38,"hash":"3d803dc6482eefd4f09010edd1c4728ab5590cfe4d7e97e484324c28d08a8640"},{"id":"func/upsertProfileRecency","name":"upsertProfileRecency","line":42,"end_line":54,"hash":"465a6fc3736df2d1666b0bad083bc728ab19f704a664d53eb376875f4f9a8427"},{"id":"func/recordProfileRecency","name":"recordProfileRecency","line":58,"end_line":64,"hash":"4866765ec30a3c1b39bd68d1d51a9fd1ed2ea830182f9b7e45b55e948db67481"},{"id":"func/qualifyingCandidate","name":"qualifyingCandidate","line":68,"end_line":78,"hash":"c1595bafcea0d5ddc0c39d7ee30bea75250d3fabb46f9fd2925fc11dc182d827"},{"id":"func/newerCandidate","name":"newerCandidate","line":82,"end_line":86,"hash":"b9eabd80bee99447221c851694c9f1c0b9c8153e45e121580b72ce83cdfd766e"},{"id":"func/findNewestQualifyingPost","name":"findNewestQualifyingPost","line":88,"end_line":96,"hash":"e82f811d40c715d8c703837d4b0c0b40568d01622c902e5ebe504bf4dce56413"},{"id":"func/establishProfileRecency","name":"establishProfileRecency","line":103,"end_line":110,"hash":"bf58de2cfb1f41a13ce1964ec9fb5eb9939e6582307a6853d63ffe9603a7ffbc"}]}
// mutate4javascript-manifest-end
