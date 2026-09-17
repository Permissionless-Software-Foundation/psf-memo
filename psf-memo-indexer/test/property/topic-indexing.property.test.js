/*
  Property tests for the topic recency indexes maintained by the indexer.

  The unit tests probe handleTopicMessage, handleTopicFollow, and the
  topic-indexing helpers at a few fixed fixtures. These properties pin down
  the invariants that must hold over arbitrary interleavings of topic posts,
  follows, and unfollows:

    - Conservation: each room's summary postCount equals the number of distinct
      topic-message txids seen for that room, and lastHeight equals the newest
      post height (0 when the room has no posts).
    - Recency shape: topicRecency holds exactly one record per summarized room,
      keyed at that room's lastHeight, with the matching value.
    - Idempotence: replaying the whole action sequence leaves every index
      unchanged, so reprocessing a block never double-counts.
    - Key ordering: the inverted topicRecency key sorts newest-height-first and
      breaks ties by room name ascending, which is the read side's contract.
*/

import test from 'node:test'

import { seededRandom, forAll, intGen } from './harness.js'
import { handleTopicMessage } from '../../src/use-cases/action-types/topic-message.js'
import { handleTopicFollow } from '../../src/use-cases/action-types/topic-follow.js'
import { topicRecencyKey } from '../../src/use-cases/action-types/helpers.js'
import { PREFIX_TOPIC_FOLLOW, PREFIX_TOPIC_UNFOLLOW } from '../../src/lib/memo-codes.js'

const rng = seededRandom(20260917)

const ROOMS = ['room-0', 'room-1', 'room-2', 'room-3']
const FOLLOW_ADDRS = ['bitcoincash:qaddr-0', 'bitcoincash:qaddr-1', 'bitcoincash:qaddr-2']

function makeDb () {
  const store = new Map()
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
    async create (key, value) {
      if (!store.has(key)) store.set(key, value)
      return { success: true }
    },
    async update (key, value) {
      store.set(key, value)
      return { success: true }
    },
    async delete (key) {
      store.delete(key)
      return { success: true }
    }
  }
}

function makeAdapters () {
  return {
    postDb: makeDb(),
    postHeightDb: makeDb(),
    addrPostHeightDb: makeDb(),
    roomDb: makeDb(),
    topicSummaryDb: makeDb(),
    topicRecencyDb: makeDb(),
    processErrorDb: makeDb()
  }
}

async function processEvent (adapters, event) {
  if (event.kind === 'post') {
    const prefix = Buffer.from('6d0c', 'hex')
    await handleTopicMessage({
      adapters,
      txid: event.txid,
      signerAddr: 'bitcoincash:qauthor',
      seen: 1,
      blockHeight: event.height,
      decoded: {
        action: 'topic-message',
        prefix,
        pushDatas: [prefix, Buffer.from(event.room, 'utf8'), Buffer.from(event.text, 'utf8')]
      }
    })
    return
  }

  const prefix = event.unfollow ? PREFIX_TOPIC_UNFOLLOW : PREFIX_TOPIC_FOLLOW
  await handleTopicFollow({
    adapters,
    txid: event.txid,
    signerAddr: event.addr,
    seen: 1,
    blockHeight: event.height,
    decoded: {
      action: 'topic-follow',
      prefix,
      pushDatas: [prefix, Buffer.from(event.room, 'utf8')]
    }
  })
}

// Random interleaving of topic posts, follows, and unfollows across a small
// room set. Txids are unique per event so the expected conservation values are
// well defined even when the sequence is replayed.
function eventSequenceGen () {
  return () => {
    const count = intGen(rng, 0, 40)()
    const events = []
    for (let i = 0; i < count; i++) {
      const room = ROOMS[Math.floor(rng() * ROOMS.length)]
      if (rng() < 0.7) {
        events.push({
          kind: 'post',
          txid: `txid-${i}`,
          room,
          height: intGen(rng, 0, 9000000)(),
          text: `text-${i}`
        })
      } else {
        events.push({
          kind: 'follow',
          txid: `txid-${i}`,
          room,
          addr: FOLLOW_ADDRS[Math.floor(rng() * FOLLOW_ADDRS.length)],
          height: intGen(rng, 0, 9000000)(),
          unfollow: rng() < 0.4
        })
      }
    }
    return events
  }
}

// Expected summaries derived straight from the event list, independent of the
// implementation under test.
function expectedSummaries (events) {
  const summaries = new Map()
  const ensure = (room) => {
    if (!summaries.has(room)) summaries.set(room, { room, postCount: 0, lastHeight: 0 })
    return summaries.get(room)
  }

  for (const event of events) {
    if (event.kind === 'post') {
      const summary = ensure(event.room)
      summary.postCount++
      if (event.height > summary.lastHeight) summary.lastHeight = event.height
    } else if (!event.unfollow) {
      // Only an active follow creates a zero-post room; unfollows do not.
      ensure(event.room)
    }
  }

  return summaries
}

function snapshot (adapters) {
  return JSON.stringify({
    summaries: Array.from(adapters.topicSummaryDb.store.entries()).sort(),
    recency: Array.from(adapters.topicRecencyDb.store.entries()).sort()
  })
}

test('topic indexes conserve counts and heights over arbitrary action sequences', async () => {
  await forAll(
    eventSequenceGen(),
    async (events) => {
      const adapters = makeAdapters()
      for (const event of events) {
        await processEvent(adapters, event)
      }

      const expected = expectedSummaries(events)

      // Conservation: one summary per room with the exact count and height.
      if (adapters.topicSummaryDb.store.size !== expected.size) return false
      for (const [room, summary] of expected) {
        const stored = adapters.topicSummaryDb.store.get(room)
        if (!stored) return false
        if (stored.postCount !== summary.postCount) return false
        if (stored.lastHeight !== summary.lastHeight) return false
      }

      // Recency shape: exactly one record per room, at its lastHeight.
      if (adapters.topicRecencyDb.store.size !== expected.size) return false
      for (const [room, summary] of expected) {
        const key = topicRecencyKey(summary.lastHeight, room)
        const record = adapters.topicRecencyDb.store.get(key)
        if (!record) return false
        if (record.room !== room) return false
        if (record.blockHeight !== summary.lastHeight) return false
      }

      // Idempotence: replaying the sequence changes nothing.
      const before = snapshot(adapters)
      for (const event of events) {
        await processEvent(adapters, event)
      }
      if (snapshot(adapters) !== before) return false

      return true
    },
    { label: 'topic index conservation, shape, and idempotence' }
  )
})

test('topicRecencyKey sorts newest height first and ties by room ascending', async () => {
  await forAll(
    () => {
      return {
        h1: intGen(rng, 0, 5000000)(),
        h2: intGen(rng, 0, 5000000)(),
        r1: ROOMS[Math.floor(rng() * ROOMS.length)],
        r2: ROOMS[Math.floor(rng() * ROOMS.length)]
      }
    },
    ({ h1, h2, r1, r2 }) => {
      const lower = topicRecencyKey(h1, r1) < topicRecencyKey(h2, r2)
      const expected = h1 > h2 || (h1 === h2 && r1 < r2)
      return lower === expected
    },
    { label: 'topicRecencyKey ordering' }
  )
})
