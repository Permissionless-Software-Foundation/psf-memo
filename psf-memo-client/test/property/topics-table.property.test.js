/*
  Property tests for the topics table view model.

  The unit tests probe buildTopicsTable at fixed fixtures. These properties
  pin down the layout contract over broad random topic lists:

    - Row order: exactly one row per topic, in the input order.
    - Cell alignment: every row has one cell per header, in the header order,
      with the topic name, relative-time label, post count, and follower count
      each in its matching column.
    - Link round trip: each row link percent-encodes the room and decodes back
      to it.
    - Count conservation: the digits in the post/follower cells sum to the
      input post/follower counts.

  `now` is injected so every property is deterministic.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen } = require('./harness')
const {
  buildTopicsTable,
  TOPICS_TABLE_HEADERS,
  TOPICS_TABLE_WRAPPER_CLASS
} = require('../../src/services/topics-table')
const { relativeTime } = require('../../src/services/relative-time')

const rng = seededRandom(20260918)

const DAY = 24 * 60 * 60 * 1000
const NOW = 1800000000000

// Room names mix plain words, spaces, path separators, unicode, and a leading
// '#', so the link encoder and the '#room' label are exercised.
const ROOM_NAMES = ['bitcoin', 'cash', 'space room', 'a/b', 'são paulo', '#tagged', 'emoji-😀', '']

function randomRoom () {
  return `${ROOM_NAMES[Math.floor(rng() * ROOM_NAMES.length)]}${intGen(rng, 0, 999)()}`
}

// Fields are sometimes omitted so the default count/last-seen handling is part
// of the generated input space.
function topicGen () {
  const topic = { room: randomRoom() }
  if (rng() < 0.85) topic.postCount = intGen(rng, 0, 10000)()
  if (rng() < 0.85) topic.followerCount = intGen(rng, 0, 10000)()
  if (rng() < 0.85) topic.lastSeen = NOW - intGen(rng, 0, 400 * DAY)()
  return topic
}

function topicsGen () {
  return () => Array.from({ length: intGen(rng, 0, 20)() }, topicGen)
}

test('buildTopicsTable keeps one row per topic in the same order', async () => {
  await forAll(
    topicsGen(),
    (topics) => {
      const table = buildTopicsTable(topics, { now: NOW })
      if (table.rows.length !== topics.length) return false
      return table.rows.every((row, i) => row.room === topics[i].room)
    },
    { label: 'topics table row order' }
  )
})

test('buildTopicsTable keeps the four cells aligned with the header order', async () => {
  await forAll(
    topicsGen(),
    (topics) => {
      const table = buildTopicsTable(topics, { now: NOW })
      if (JSON.stringify(table.headers) !== JSON.stringify(TOPICS_TABLE_HEADERS)) return false
      if (table.wrapperClass !== TOPICS_TABLE_WRAPPER_CLASS) return false
      return table.rows.every((row, i) => {
        const topic = topics[i]
        return row.cells.length === TOPICS_TABLE_HEADERS.length &&
          row.cells[0] === `#${topic.room}` &&
          row.cells[1] === relativeTime(topic.lastSeen, NOW) &&
          row.cells[2] === `${topic.postCount ?? 0} posts` &&
          row.cells[3] === `${topic.followerCount ?? 0} followers`
      })
    },
    { label: 'topics table cell alignment' }
  )
})

test('buildTopicsTable percent-encodes row links that round-trip the room', async () => {
  await forAll(
    topicsGen(),
    (topics) => {
      const table = buildTopicsTable(topics, { now: NOW })
      return table.rows.every((row) => {
        if (row.href !== `/topics/${encodeURIComponent(row.room)}`) return false
        return decodeURIComponent(row.href.slice('/topics/'.length)) === row.room
      })
    },
    { label: 'topics table link round trip' }
  )
})

test('buildTopicsTable conserves post and follower counts into the cells', async () => {
  await forAll(
    topicsGen(),
    (topics) => {
      const table = buildTopicsTable(topics, { now: NOW })
      const expectedPosts = topics.reduce((sum, topic) => sum + (topic.postCount ?? 0), 0)
      const expectedFollowers = topics.reduce((sum, topic) => sum + (topic.followerCount ?? 0), 0)
      const posted = table.rows.reduce((sum, row) => sum + Number.parseInt(row.cells[2], 10), 0)
      const followers = table.rows.reduce((sum, row) => sum + Number.parseInt(row.cells[3], 10), 0)
      return posted === expectedPosts && followers === expectedFollowers
    },
    { label: 'topics table count conservation' }
  )
})
