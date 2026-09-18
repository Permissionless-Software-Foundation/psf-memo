/*
  Unit tests for the relative-time formatter used by the topics page.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { relativeTime } = require('../../src/services/relative-time')

const NOW = 1800000000000
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

test('returns "No posts" when there is no last-seen time', () => {
  assert.equal(relativeTime(0, NOW), 'No posts')
  assert.equal(relativeTime(null, NOW), 'No posts')
  assert.equal(relativeTime(undefined, NOW), 'No posts')
})

test('returns "Less than an hour ago" for under an hour', () => {
  assert.equal(relativeTime(NOW - 1, NOW), 'Less than an hour ago')
  assert.equal(relativeTime(NOW - (HOUR - 1), NOW), 'Less than an hour ago')
})

test('returns "1 hour ago" at exactly one hour', () => {
  assert.equal(relativeTime(NOW - HOUR, NOW), '1 hour ago')
})

test('returns whole hours under a day', () => {
  assert.equal(relativeTime(NOW - 2 * HOUR, NOW), '2 hours ago')
  assert.equal(relativeTime(NOW - 5 * HOUR, NOW), '5 hours ago')
  assert.equal(relativeTime(NOW - 23 * HOUR, NOW), '23 hours ago')
})

test('returns "1 day ago" at exactly one day', () => {
  assert.equal(relativeTime(NOW - DAY, NOW), '1 day ago')
})

test('returns whole days at or beyond a day', () => {
  assert.equal(relativeTime(NOW - 2 * DAY, NOW), '2 days ago')
  assert.equal(relativeTime(NOW - 30 * DAY, NOW), '30 days ago')
})

test('floors partial hours and days', () => {
  assert.equal(relativeTime(NOW - (5 * HOUR + 59 * 60 * 1000), NOW), '5 hours ago')
  assert.equal(relativeTime(NOW - (2 * DAY + 23 * HOUR), NOW), '2 days ago')
})
