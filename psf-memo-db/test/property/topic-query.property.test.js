/*
  Property tests for the TopicQuery adapter.

  The unit tests probe listTopics and getTopicPostTxids at a few fixed
  fixtures. These properties pin down invariants that hold over broad random
  inputs:

    - listTopics conservation: the sum of postCounts equals the number of
      post entries in the rooms store, each room's count matches its own post
      entries, and the topics are returned sorted by room name.
    - getTopicPostTxids ordering + pagination: posts are returned newest-first
      by block height, the total matches the room's post entries, and the
      offset/limit slice is exact.
    - roomFromKey / txidFromKey round-trip: the room and txid are recovered
      from a `${room}:${txid}` key.
*/

import test from 'node:test'

import { seededRandom, forAll, intGen, txidGen } from './harness.js'
import TopicQuery from '../../src/adapters/topic-query.js'

const rng = seededRandom(20260828)

// In-memory rooms store mirroring the LevelDB iterator contract (gte/lte
// prefix bounds over the key string).
function makeRoomsDb (entries) {
  const store = new Map(entries.map((e) => [e.key, e.value]))
  return {
    async * iterator (opts = {}) {
      const { gte, lte } = opts
      let keys = Array.from(store.keys()).sort()
      if (gte !== undefined) keys = keys.filter((k) => k >= gte)
      if (lte !== undefined) keys = keys.filter((k) => k <= lte)
      for (const key of keys) {
        yield [key, store.get(key)]
      }
    }
  }
}

function makeQuery (entries) {
  return new TopicQuery({
    roomsDb: makeRoomsDb(entries),
    postsDb: {}
  })
}

function fixtureGen () {
  return () => {
    const roomCount = intGen(rng, 0, 5)()
    const rooms = []
    const entries = []
    for (let i = 0; i < roomCount; i++) {
      const room = `room-${i}`
      rooms.push(room)

      const postCount = intGen(rng, 0, 8)()
      for (let j = 0; j < postCount; j++) {
        entries.push({
          key: `${room}:${txidGen(rng)}`,
          value: {
            type: 'post',
            txid: txidGen(rng),
            blockHeight: intGen(rng, 0, 9000000)(),
            room
          }
        })
      }

      const followCount = intGen(rng, 0, 3)()
      for (let j = 0; j < followCount; j++) {
        entries.push({
          key: `${room}:${txidGen(rng)}`,
          value: { type: 'follow', room }
        })
      }
    }

    return {
      entries,
      rooms,
      limit: intGen(rng, 1, 10)(),
      offset: intGen(rng, 0, 8)()
    }
  }
}

test('listTopics conserves post counts and returns rooms sorted by name', async () => {
  await forAll(
    fixtureGen(),
    async ({ entries, rooms }) => {
      const query = makeQuery(entries)
      const topics = await query.listTopics()

      const postEntries = entries.filter((e) => e.value.type === 'post')
      const totalPosts = topics.reduce((sum, t) => sum + t.postCount, 0)
      if (totalPosts !== postEntries.length) return false

      const expectedRooms = [...new Set(entries.map((e) => e.value.room))].sort((a, b) => a.localeCompare(b))
      if (JSON.stringify(topics.map((t) => t.room)) !== JSON.stringify(expectedRooms)) return false

      for (const topic of topics) {
        const roomPosts = postEntries.filter((e) => e.value.room === topic.room).length
        if (topic.postCount !== roomPosts) return false
      }
      return true
    },
    { label: 'listTopics conservation and ordering' }
  )
})

test('getTopicPostTxids returns posts newest-first with an exact total and slice', async () => {
  await forAll(
    fixtureGen(),
    async ({ entries, rooms, limit, offset }) => {
      if (rooms.length === 0) return true
      const room = rooms[0]
      const query = makeQuery(entries)

      const { txids, total } = await query.getTopicPostTxids(room, { limit, offset })

      const roomPosts = entries
        .filter((e) => e.value.type === 'post' && e.value.room === room)
        .sort((a, b) => b.value.blockHeight - a.value.blockHeight)

      if (total !== roomPosts.length) return false

      const expectedTxids = roomPosts.slice(offset, offset + limit).map((e) => e.value.txid)
      if (JSON.stringify(txids) !== JSON.stringify(expectedTxids)) return false

      // Newest-first ordering invariant.
      for (let i = 1; i < roomPosts.length; i++) {
        if (roomPosts[i - 1].value.blockHeight < roomPosts[i].value.blockHeight) return false
      }
      return true
    },
    { label: 'getTopicPostTxids ordering and pagination' }
  )
})

test('roomFromKey and txidFromKey round-trip a room:txid key', async () => {
  const query = makeQuery([])

  await forAll(
    fixtureGen(),
    ({ entries }) => {
      for (const e of entries) {
        const room = query.roomFromKey(e.key, undefined)
        const txid = query.txidFromKey(e.key)
        const [expectedRoom, expectedTxid] = e.key.split(':')
        if (room !== expectedRoom) return false
        if (txid !== expectedTxid) return false
      }
      return true
    },
    { label: 'roomFromKey/txidFromKey round-trip' }
  )
})
