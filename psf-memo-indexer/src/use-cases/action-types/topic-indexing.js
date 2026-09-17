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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-17T16:22:46.190Z","module_hash":"cdd90074000f9eddb01ce298351d75ae8afdecc8fe34711a0a415099d64a7e70","functions":[{"id":"func/recordTopicPost","name":"recordTopicPost","line":19,"end_line":40,"hash":"91b542cddca534356bcaf15426ec2abccd04d610cf8db4c21de7deb216b250d8"},{"id":"func/ensureTopicRoom","name":"ensureTopicRoom","line":44,"end_line":50,"hash":"ca3cb6538d16deea7546a5bbf1a24a752f803a8929b7da8c3b8ba9582a20816a"}]}
// mutate4javascript-manifest-end
