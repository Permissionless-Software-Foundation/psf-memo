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

// Establish a profile's recency from the posts already indexed for its
// address. Runs when a set-profile action creates the profile, so a profile
// set after posting still reports the existing newest confirmed qualifying
// post. Replies and poll creations are excluded and unconfirmed posts are
// ignored.
export async function establishProfileRecency (adapters, addr) {
  if (!adapters.profileRecencyDb || !adapters.addrPostHeightDb) return null

  const chainBlockHeight = await getChainBlockHeight(adapters)
  const range = { gte: `${addr}:`, lte: `${addr}:\uffff` }
  let best = null

  for await (const [key, value] of adapters.addrPostHeightDb.iterator(range)) {
    if (!String(key).startsWith(`${addr}:`)) continue
    const txid = value?.txid
    const blockHeight = value?.blockHeight ?? 0
    if (!txid) continue
    if (!isConfirmed(blockHeight, chainBlockHeight)) continue
    if (await getIfPresent(adapters.postParentDb, txid)) continue
    if (await getIfPresent(adapters.pollDb, txid)) continue

    const post = await getIfPresent(adapters.postDb, txid)
    const seen = post?.seen ?? 0
    if (!best || blockHeight > best.blockHeight || (blockHeight === best.blockHeight && seen > best.seen)) {
      best = { blockHeight, seen }
    }
  }

  if (!best) return null
  return upsertProfileRecency(adapters, addr, best.blockHeight, best.seen)
}
