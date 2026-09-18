/*
  Maintain the topicSummaries and topicRecency indexes for Memo topic activity.

  topicSummaries: one record per room keyed by room, value
    { room, postCount, lastHeight, lastSeen, followerCount }.
  topicRecency: one record per room keyed by `${invertedHeight}:${room}`, value
    { room, blockHeight }. Follow-only rooms live at height 0. The height is
    inverted so an ascending scan yields newest-first.

  Both indexes are written with the generic entity `update`, which upserts, so
  re-running an action is safe.
*/

import { getIfPresent, roomKey, topicRecencyKey } from './helpers.js'

// Add a post to the room's summary and move its recency record to the newest
// height. A room that is reprocessed is filtered out before this runs, so the
// post count is not double-counted. lastSeen tracks the newest post `seen`
// time while lastHeight tracks the newest block height, so a replayed block
// with out-of-order timestamps still converges.
export async function recordTopicPost (adapters, room, blockHeight, seen) {
  const height = blockHeight ?? 0
  const seenAt = seen ?? 0
  const summary = await getIfPresent(adapters.topicSummaryDb, room)
  const lastHeight = Math.max(summary?.lastHeight ?? 0, height)
  const lastSeen = Math.max(summary?.lastSeen ?? 0, seenAt)

  await adapters.topicSummaryDb.update(room, {
    room,
    postCount: (summary?.postCount ?? 0) + 1,
    lastHeight,
    lastSeen,
    followerCount: summary?.followerCount ?? 0
  })

  // When the room moved to a newer height, delete the stale recency record so
  // each room has exactly one recency entry.
  if (summary && (summary.lastHeight ?? 0) !== lastHeight) {
    await adapters.topicRecencyDb.delete(topicRecencyKey(summary.lastHeight ?? 0, room))
  }

  await adapters.topicRecencyDb.update(topicRecencyKey(lastHeight, room), {
    room,
    blockHeight: lastHeight
  })
}

// Give a follow-only room a zero-post summary and recency record. A room that
// already has a summary (because it has posts) is left unchanged. Returns the
// existing or created summary.
export async function ensureTopicRoom (adapters, room) {
  const summary = await getIfPresent(adapters.topicSummaryDb, room)
  if (summary) return summary

  const created = { room, postCount: 0, lastHeight: 0, lastSeen: 0, followerCount: 0 }
  await adapters.topicSummaryDb.update(room, created)
  await adapters.topicRecencyDb.update(topicRecencyKey(0, room), { room, blockHeight: 0 })
  return created
}

// Apply a topic follow or unfollow to the room's summary. The follower count
// changes only when the address's follow state actually flips, so replaying a
// follow (or unfollow) is idempotent. The room record is upserted so the
// previous state is available to compute the delta.
export async function recordTopicFollow (adapters, record) {
  const { room, addr, unfollow } = record
  const key = roomKey(room, addr)
  const previous = await getIfPresent(adapters.roomDb, key)
  const wasActive = previous?.type === 'follow' && previous.unfollow !== true
  const isActive = !unfollow

  await adapters.roomDb.update(key, record)

  const existing = await getIfPresent(adapters.topicSummaryDb, room)
  // An unfollow for a room that was never summarized is a no-op and must not
  // create a zero-post room.
  if (!existing && !isActive) return null

  const summary = existing || await ensureTopicRoom(adapters, room)
  const delta = Number(isActive) - Number(wasActive)
  if (delta === 0) return summary

  const updated = {
    ...summary,
    followerCount: Math.max(0, (summary.followerCount ?? 0) + delta)
  }
  await adapters.topicSummaryDb.update(room, updated)
  return updated
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-18T13:03:40.448Z","module_hash":"e9af75f22787ded23bf9ff7e714409eab94c48ef8f5b860daf0d51959912b213","functions":[{"id":"func/recordTopicPost","name":"recordTopicPost","line":21,"end_line":46,"hash":"21d57fd91bb1c043f1c20012f7a3f1c0ea5704d1c0bf1c39f2b2d1300ae23097"},{"id":"func/ensureTopicRoom","name":"ensureTopicRoom","line":51,"end_line":59,"hash":"d8e7974e36399709da6e6e9b5d4193cc81cf99feb4f2da839bd9911e600b4ebd"},{"id":"func/recordTopicFollow","name":"recordTopicFollow","line":65,"end_line":89,"hash":"1538d50df786da982e65e306812ee41045ca2ac5a9869e9a6c639de413b0e678"}]}
// mutate4javascript-manifest-end
