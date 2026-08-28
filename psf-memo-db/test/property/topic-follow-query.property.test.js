/*
  Property tests for the TopicQuery topic-follow read side.

  The unit tests probe isFollowingRoom and listRoomFollowers at a few fixed
  fixtures. These properties pin down invariants that hold over broad random
  follow-record sets:

    - listRoomFollowers conservation: for every room the returned set equals
      exactly the active (non-unfollowed) follow addresses for that room,
      regardless of surrounding post/follow records.
    - isFollowingRoom round trip: an address is reported following a room
      exactly when an active follow record for that room:addr exists.
    - followAddrFromValue recovery: the follower address is recovered from a
      `${room}:${addr}` key.
*/

import test from 'node:test'

import { seededRandom, forAll, intGen } from './harness.js'
import TopicQuery from '../../src/adapters/topic-query.js'

const rng = seededRandom(20260831)

// In-memory rooms store mirroring the LevelDB contract TopicQuery relies on:
// both an iterator over key/value entries (listRoomFollowers, listTopics) and
// a point get that throws notFound (isFollowingRoom).
function makeRoomsDb (entries) {
  const store = new Map(entries.map((e) => [e.key, e.value]))
  return {
    async get (key) {
      if (!store.has(key)) {
        const err = new Error('not found')
        err.notFound = true
        throw err
      }
      return store.get(key)
    },
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

// Random set of rooms and topic follow records. Each room has some candidate
// addresses; not every address follows, and a follow may later be unfollowed.
function followSetGen () {
  return () => {
    const roomCount = intGen(rng, 1, 4)()
    const rooms = []
    const entries = []
    for (let i = 0; i < roomCount; i++) {
      const room = `room-${i}`
      rooms.push(room)

      const addrCount = intGen(rng, 1, 6)()
      for (let j = 0; j < addrCount; j++) {
        const addr = `bitcoincash:q${i}-${j}`
        if (rng() < 0.35) continue
        entries.push({
          key: `${room}:${addr}`,
          value: {
            type: 'follow',
            room,
            addr,
            unfollow: rng() < 0.4
          }
        })
      }

      // A stray post entry in the same room must not count as a follower.
      if (rng() < 0.5) {
        entries.push({
          key: `${room}:post-${i}`,
          value: { type: 'post', room }
        })
      }
    }
    return { rooms, entries }
  }
}

test('listRoomFollowers returns exactly the active follow addresses for a room', async () => {
  await forAll(
    followSetGen(),
    async ({ rooms, entries }) => {
      const query = makeQuery(entries)

      for (const room of rooms) {
        const got = await query.listRoomFollowers(room)
        const expected = Array.from(
          new Set(
            entries
              .filter((e) => e.value.type === 'follow' && e.value.room === room && e.value.unfollow !== true && e.value.addr)
              .map((e) => e.value.addr)
          )
        )
        const want = expected.sort((a, b) => a.localeCompare(b))
        const received = got.slice().sort((a, b) => a.localeCompare(b))
        if (JSON.stringify(received) !== JSON.stringify(want)) return false
      }
      return true
    },
    { label: 'listRoomFollowers conservation' }
  )
})

test('isFollowingRoom is true exactly for active follow records', async () => {
  await forAll(
    followSetGen(),
    async ({ entries }) => {
      const query = makeQuery(entries)

      for (const e of entries) {
        if (e.value.type !== 'follow') continue
        const { room, addr } = e.value
        const following = await query.isFollowingRoom(addr, room)
        if (following !== (e.value.unfollow !== true)) return false
      }

      // A room:addr never recorded is never following.
      const unseen = await query.isFollowingRoom('bitcoincash:qunseen', 'room-99')
      if (unseen !== false) return false
      return true
    },
    { label: 'isFollowingRoom round trip' }
  )
})

test('followAddrFromValue recovers the address from a room:addr record', async () => {
  await forAll(
    followSetGen(),
    ({ entries }) => {
      const query = makeQuery([])
      for (const e of entries) {
        if (e.value.type !== 'follow') continue
        const addr = query.followAddrFromValue(e.value, e.key)
        if (addr !== e.value.addr) return false
      }
      return true
    },
    { label: 'followAddrFromValue recovery' }
  )
})
