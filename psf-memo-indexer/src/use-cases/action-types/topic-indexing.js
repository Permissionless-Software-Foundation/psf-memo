/*
  Maintain the topicSummaries and topicRecency indexes for Memo topic activity.

  topicSummaries: one record per room keyed by room, value
    { room, postCount, lastHeight }.
  topicRecency: one record per room keyed by `${invertedHeight}:${room}`, value
    { room, blockHeight }. Follow-only rooms live at height 0. The height is
    inverted so an ascending scan yields newest-first.

  Both indexes are written with the generic entity `update`, which upserts, so
  re-running an action is safe.
*/

import { getIfPresent, topicRecencyKey } from './helpers.js'

// Add a post to the room's summary and move its recency record to the newest
// height. A room that is reprocessed is filtered out before this runs, so the
// post count is not double-counted.
export async function recordTopicPost (adapters, room, blockHeight) {
  const height = blockHeight ?? 0
  const summary = await getIfPresent(adapters.topicSummaryDb, room)
  const lastHeight = Math.max(summary?.lastHeight ?? 0, height)

  await adapters.topicSummaryDb.update(room, {
    room,
    postCount: (summary?.postCount ?? 0) + 1,
    lastHeight
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
// already has a summary (because it has posts) is left unchanged.
export async function ensureTopicRoom (adapters, room) {
  const summary = await getIfPresent(adapters.topicSummaryDb, room)
  if (summary) return

  await adapters.topicSummaryDb.update(room, { room, postCount: 0, lastHeight: 0 })
  await adapters.topicRecencyDb.update(topicRecencyKey(0, room), { room, blockHeight: 0 })
}
