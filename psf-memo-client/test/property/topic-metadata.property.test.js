/*
  Property tests for the topic metadata display helpers.

  The unit tests probe relativeTime and getLastSeenLabel at fixed fixtures.
  These properties pin down the formatting contract over broad random times:

    - Classification: the label matches the feature spec's buckets computed
      independently from elapsed time.
    - Pluralization: a label is singular exactly when its magnitude is one.
    - Monotonicity: a longer elapsed time never yields a smaller hour/day
      magnitude, so the label orders time correctly.
    - Consistency: getLastSeenLabel returns the same label relativeTime
      produces for a loaded topic, and null for an unknown topic.

  `now` is injected so every property is deterministic.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { seededRandom, forAll, intGen } = require('./harness')
const { relativeTime } = require('../../src/services/relative-time')
const TopicDiscoveryPage = require('../../src/services/topic-discovery-page')

const rng = seededRandom(20260918)

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const NOW = 1800000000000

// Reference classifier written from the feature spec, independent of the
// implementation under test.
function expectedLabel (elapsed) {
  if (elapsed < HOUR) return 'Less than an hour ago'
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR)
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }
  const days = Math.floor(elapsed / DAY)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

// Convert an hour/day label back to a magnitude in hours, for ordering checks.
function elapsedHours (label) {
  const match = /^(\d+) (hour|day)s? ago$/.exec(label)
  if (!match) return 0
  const value = Number(match[1])
  return match[2] === 'day' ? value * 24 : value
}

test('relativeTime classifies every elapsed time per the spec buckets', async () => {
  await forAll(
    () => intGen(rng, 0, 400 * DAY)(),
    (elapsed) => relativeTime(NOW - elapsed, NOW) === expectedLabel(elapsed),
    { label: 'relativeTime bucket classification' }
  )
})

test('relativeTime labels are singular exactly at magnitude one', async () => {
  await forAll(
    () => intGen(rng, HOUR, 365 * DAY)(),
    (elapsed) => {
      const label = relativeTime(NOW - elapsed, NOW)
      const match = /^(\d+) (hour|day)s? ago$/.exec(label)
      if (!match) return false
      return label.includes('s ago') === (Number(match[1]) !== 1)
    },
    { label: 'relativeTime pluralization' }
  )
})

test('relativeTime is monotonic as elapsed time grows', async () => {
  await forAll(
    () => {
      const first = HOUR + intGen(rng, 0, 60 * DAY)()
      return { first, second: first + intGen(rng, 0, 60 * DAY)() }
    },
    ({ first, second }) => {
      return elapsedHours(relativeTime(NOW - first, NOW)) <=
        elapsedHours(relativeTime(NOW - second, NOW))
    },
    { label: 'relativeTime monotonicity' }
  )
})

test('relativeTime reports "No posts" for a missing last-seen time', () => {
  for (const lastSeen of [0, null, undefined]) {
    assert.equal(relativeTime(lastSeen, NOW), 'No posts')
  }
})

test('getLastSeenLabel mirrors relativeTime for loaded topics and null otherwise', async () => {
  await forAll(
    () => {
      const topics = []
      const count = intGen(rng, 0, 10)()
      for (let i = 0; i < count; i++) {
        topics.push({
          room: `room-${i}`,
          postCount: 1,
          lastSeen: NOW - intGen(rng, 0, 400 * DAY)()
        })
      }
      return topics
    },
    async (topics) => {
      const page = new TopicDiscoveryPage({
        memoDb: { async getTopics () { return { topics } } }
      })
      await page.load()

      for (const topic of topics) {
        if (page.getLastSeenLabel(topic.room, NOW) !== relativeTime(topic.lastSeen, NOW)) return false
      }
      if (page.getLastSeenLabel('missing-room', NOW) !== null) return false
      return true
    },
    { label: 'getLastSeenLabel consistency' }
  )
})
