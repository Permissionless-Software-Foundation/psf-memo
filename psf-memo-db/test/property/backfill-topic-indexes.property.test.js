/*
  Property tests for the topic index backfill.

  The unit tests probe backfillTopicIndexes at a few fixed fixtures. These
  properties pin down the invariants that must hold over arbitrary rooms-store
  contents:

    - Conservation: every room in the rooms store gets a summary whose
      postCount equals its number of post entries and whose lastHeight is the
      newest post height (0 for follow-only rooms).
    - Recency shape: topicRecency holds exactly one record per summarized room,
      keyed at that room's lastHeight, with the matching value.
    - Idempotence: running the backfill twice produces identical indexes, and
      stale records from earlier runs are removed.
    - Key ordering: the inverted topicRecency key sorts newest-height-first and
      breaks ties by room name ascending, which is the read side's contract.
*/

import test from 'node:test'

import { seededRandom, forAll, intGen } from './harness.js'
import { backfillTopicIndexes, topicRecencyKey } from '../../src/lib/backfill-topic-indexes.js'

const rng = seededRandom(20260917)

const ROOMS = ['room-0', 'room-1', 'room-2', 'room-3']
const FOLLOW_ADDRS = ['addr-0', 'addr-1', 'addr-2']

// In-memory LevelDB-shaped store supporting the iterator/get/put/del surface
// the backfill uses.
function makeDb (records = []) {
  const store = new Map(records)
  return {
    store,
    async get (key) {
      if (!store.has(key)) {
        const err = new Error('not found')
        err.notFound = true
        throw err
      }
      return store.get(key)
    },
    async put (key, value) {
      store.set(key, value)
    },
    async del (key) {
      store.delete(key)
    },
    async * iterator () {
      for (const key of Array.from(store.keys()).sort()) {
        yield [key, store.get(key)]
      }
    }
  }
}

// Random rooms-store contents: each room gets a random number of posts and
// follow records, including unfollows and follows with no posts.
function roomsGen () {
  return () => {
    const entries = []
    let seq = 0
    for (const room of ROOMS) {
      const postCount = intGen(rng, 0, 6)()
      for (let i = 0; i < postCount; i++) {
        entries.push([
          `${room}:post-${seq}`,
          { room, txid: `post-${seq}`, type: 'post', blockHeight: intGen(rng, 0, 9000000)() }
        ])
        seq++
      }

      const followCount = intGen(rng, 0, 3)()
      for (let i = 0; i < followCount; i++) {
        const addr = FOLLOW_ADDRS[Math.floor(rng() * FOLLOW_ADDRS.length)]
        entries.push([
          `${room}:${addr}-${seq}`,
          { room, addr, type: 'follow', unfollow: rng() < 0.4 }
        ])
        seq++
      }
    }
    return entries
  }
}

function expectedSummaries (entries) {
  const summaries = new Map()
  for (const [, value] of entries) {
    const room = value.room
    if (!summaries.has(room)) summaries.set(room, { room, postCount: 0, lastHeight: 0 })
    if (value.type === 'post') {
      const summary = summaries.get(room)
      summary.postCount++
      const height = value.blockHeight ?? 0
      if (height > summary.lastHeight) summary.lastHeight = height
    }
  }
  return summaries
}

function snapshot (db) {
  return JSON.stringify(Array.from(db.store.entries()).sort())
}

test('backfill conserves every room summary and builds the recency index', async () => {
  await forAll(
    roomsGen(),
    async (entries) => {
      const roomsDb = makeDb(entries)
      const topicSummariesDb = makeDb()
      const topicRecencyDb = makeDb()

      const result = await backfillTopicIndexes({ roomsDb, topicSummariesDb, topicRecencyDb })

      const expected = expectedSummaries(entries)
      if (result.rooms !== expected.size) return false
      if (topicSummariesDb.store.size !== expected.size) return false

      for (const [room, summary] of expected) {
        const stored = topicSummariesDb.store.get(room)
        if (!stored) return false
        if (stored.postCount !== summary.postCount) return false
        if (stored.lastHeight !== summary.lastHeight) return false

        const key = topicRecencyKey(summary.lastHeight, room)
        const recency = topicRecencyDb.store.get(key)
        if (!recency) return false
        if (recency.room !== room) return false
        if (recency.blockHeight !== summary.lastHeight) return false
      }

      // Exactly one recency record per room.
      if (topicRecencyDb.store.size !== expected.size) return false

      // Idempotence: a second run leaves the indexes byte-for-byte identical.
      const beforeSummaries = snapshot(topicSummariesDb)
      const beforeRecency = snapshot(topicRecencyDb)
      await backfillTopicIndexes({ roomsDb, topicSummariesDb, topicRecencyDb })
      if (snapshot(topicSummariesDb) !== beforeSummaries) return false
      if (snapshot(topicRecencyDb) !== beforeRecency) return false

      return true
    },
    { label: 'backfill conservation, recency shape, and idempotence' }
  )
})

test('backfill drops stale recency and summary records from earlier runs', async () => {
  await forAll(
    roomsGen(),
    async (entries) => {
      const roomsDb = makeDb(entries)
      const topicSummariesDb = makeDb([
        ['stale-room', { room: 'stale-room', postCount: 9, lastHeight: 999999 }]
      ])
      const topicRecencyDb = makeDb([
        [topicRecencyKey(999999, 'stale-room'), { room: 'stale-room', blockHeight: 999999 }],
        [topicRecencyKey(123456, 'another-stale'), { room: 'another-stale', blockHeight: 123456 }]
      ])

      await backfillTopicIndexes({ roomsDb, topicSummariesDb, topicRecencyDb })

      // No record may survive for a room absent from the rooms store.
      for (const [room] of topicSummariesDb.store) {
        if (room === 'stale-room') return false
      }
      for (const [, value] of topicRecencyDb.store) {
        if (value.room === 'stale-room' || value.room === 'another-stale') return false
      }

      return true
    },
    { label: 'backfill removes stale records' }
  )
})

test('topicRecencyKey sorts newest height first and ties by room ascending', async () => {
  await forAll(
    () => ({
      h1: intGen(rng, 0, 5000000)(),
      h2: intGen(rng, 0, 5000000)(),
      r1: ROOMS[Math.floor(rng() * ROOMS.length)],
      r2: ROOMS[Math.floor(rng() * ROOMS.length)]
    }),
    ({ h1, h2, r1, r2 }) => {
      const lower = topicRecencyKey(h1, r1) < topicRecencyKey(h2, r2)
      const expected = h1 > h2 || (h1 === h2 && r1 < r2)
      return lower === expected
    },
    { label: 'topicRecencyKey ordering' }
  )
})
