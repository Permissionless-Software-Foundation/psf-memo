/*
  Library to build the topicSummaries and topicRecency indexes from an
  existing rooms store.

  The read side serves GET /topics from these two indexes:
    - topicSummaries: one record per room keyed by room, value
      { room, postCount, lastHeight }.
    - topicRecency: one record per room keyed `${invertedHeight}:${room}`,
      value { room, blockHeight }. Follow-only rooms live at height 0. The
      height is inverted so an ascending scan yields newest-first.

  The backfill recomputes both indexes from the rooms store, so running it
  more than once is idempotent. Stale index records for rooms that no longer
  have any room entry, or that moved to a new height, are removed.

  The LevelDB handles are injected so the logic stays testable and free of
  file-system concerns; the CLI wrapper in util/room opens the real stores.
*/

const HEIGHT_PAD = 12
// Heights are inverted in the recency key so a plain ascending iterator yields
// rooms from most recent to least recent. Rooms at the same height still sort
// by room name ascending.
const MAX_HEIGHT = 999999999999

export function topicRecencyKey (blockHeight, room) {
  const inverted = MAX_HEIGHT - (blockHeight ?? 0)
  return `${String(inverted).padStart(HEIGHT_PAD, '0')}:${room}`
}

// The room name is stored on the record; fall back to the first key segment so
// a record written without it is still attributed to a room.
function roomFromEntry (key, value) {
  if (value && typeof value.room === 'string') return value.room
  return String(key).split(':')[0]
}

// Fold one post entry into its room summary, tracking the newest height.
function applyPost (summary, value) {
  summary.postCount++
  const height = value.blockHeight ?? 0
  if (height > summary.lastHeight) summary.lastHeight = height
}

async function collectSummaries (roomsDb) {
  const summaries = new Map()

  for await (const [key, value] of roomsDb.iterator()) {
    const room = roomFromEntry(key, value)
    if (!summaries.has(room)) {
      summaries.set(room, { room, postCount: 0, lastHeight: 0 })
    }

    if (value?.type === 'post') {
      applyPost(summaries.get(room), value)
    }
  }

  return summaries
}

// Remove index records that no longer have a desired key.
async function removeStale (db, desiredKeys) {
  for await (const [key] of db.iterator()) {
    if (!desiredKeys.has(key)) {
      await db.del(key)
    }
  }
}

export async function backfillTopicIndexes ({ roomsDb, topicSummariesDb, topicRecencyDb }) {
  const summaries = await collectSummaries(roomsDb)
  const desiredRecencyKeys = new Set()

  for (const summary of summaries.values()) {
    await topicSummariesDb.put(summary.room, summary)

    const key = topicRecencyKey(summary.lastHeight, summary.room)
    desiredRecencyKeys.add(key)
    await topicRecencyDb.put(key, { room: summary.room, blockHeight: summary.lastHeight })
  }

  await removeStale(topicRecencyDb, desiredRecencyKeys)
  await removeStale(topicSummariesDb, new Set(summaries.keys()))

  return { rooms: summaries.size }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-17T16:40:51.620Z","module_hash":"7a67d2c6ca7ea2494b1ff3a6dcc703c47a0dfd341fe2d593750b82b810f36da1","functions":[{"id":"func/topicRecencyKey","name":"topicRecencyKey","line":26,"end_line":29,"hash":"a034a6023f72d08e40d28bb51e41e370c1a42d5682315b162a7c2a81f7f31310"},{"id":"func/roomFromEntry","name":"roomFromEntry","line":33,"end_line":36,"hash":"5bf2a8338a623f65191729bc2433a87869b085b29547fbb5e42ebaa67d6473c1"},{"id":"func/applyPost","name":"applyPost","line":39,"end_line":43,"hash":"4edf9dd98a5889c62fd60f4107563427f0a55dc0250c27f6ac0af49b6b934c42"},{"id":"func/collectSummaries","name":"collectSummaries","line":45,"end_line":60,"hash":"73a07286477939379fb82ceace71991aa0cd830f041897dbe4cb5748c091a93f"},{"id":"func/removeStale","name":"removeStale","line":63,"end_line":69,"hash":"09cc44be72b9f955722f17c117d8ca18fe953dcf2cbd6efab110798dce4d0417"},{"id":"func/backfillTopicIndexes","name":"backfillTopicIndexes","line":71,"end_line":87,"hash":"7a6c1207032b16c5e7fc90fe9f7e2543b22d126fc0924296573c911dbf21d8c4"}]}
// mutate4javascript-manifest-end
