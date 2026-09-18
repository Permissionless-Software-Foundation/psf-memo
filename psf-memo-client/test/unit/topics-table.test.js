/*
  Unit tests for the topics table view model.

  The React Topics page renders a react-bootstrap Table from buildTopicsTable,
  so these tests pin down the header order, the per-row cell order, the row
  link, and the horizontal-scroll wrapper without a DOM.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildTopicsTable,
  TOPICS_TABLE_HEADERS,
  TOPICS_TABLE_WRAPPER_CLASS
} = require('../../src/services/topics-table')

const NOW = 1800000000000

test('lists the four column headers in order', () => {
  const table = buildTopicsTable([], { now: NOW })

  assert.deepEqual(table.headers, ['Topic', 'Most recent post', 'Posts', 'Followers'])
  assert.deepEqual(table.headers, TOPICS_TABLE_HEADERS)
})

test('builds a row with name, relative time, post count, and follower count', () => {
  const table = buildTopicsTable([
    { room: 'bitcoin', postCount: 5, followerCount: 3, lastSeen: 1799996400000 }
  ], { now: NOW })

  assert.deepEqual(table.rows, [{
    room: 'bitcoin',
    href: '/topics/bitcoin',
    cells: ['#bitcoin', '1 hour ago', '5 posts', '3 followers']
  }])
})

test('renders "No posts" for a topic with no last-seen time', () => {
  const table = buildTopicsTable([
    { room: 'lone', postCount: 0, followerCount: 7, lastSeen: 0 }
  ], { now: NOW })

  assert.deepEqual(table.rows[0].cells, ['#lone', 'No posts', '0 posts', '7 followers'])
})

test('percent-encodes the room name in the row link', () => {
  const table = buildTopicsTable([
    { room: 'space room', postCount: 1, followerCount: 0, lastSeen: NOW }
  ], { now: NOW })

  assert.equal(table.rows[0].href, '/topics/space%20room')
})

test('defaults missing counts and last-seen time to safe values', () => {
  const table = buildTopicsTable([{ room: 'legacy' }], { now: NOW })

  assert.deepEqual(table.rows[0].cells, ['#legacy', 'No posts', '0 posts', '0 followers'])
})

test('wraps the table so it scrolls horizontally on narrow screens', () => {
  const table = buildTopicsTable([], { now: NOW })

  assert.equal(table.wrapperClass, TOPICS_TABLE_WRAPPER_CLASS)
  assert.equal(table.wrapperClass, 'table-responsive')
})
