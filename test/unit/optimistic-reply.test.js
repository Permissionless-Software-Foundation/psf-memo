/*
  Unit tests for the optimistic reply object builder
  (src/services/optimistic-reply.js).

  The reply form renders an optimistic reply immediately after a successful
  broadcast, before the thread is refreshed from the network. This module
  shapes that reply object so the shape is covered by unit tests and the
  React form stays a thin adapter.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { buildOptimisticReply } = require('../../src/services/optimistic-reply')

const TXID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const ADDR = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

test('builds a reply with a zero reply count and no child replies', () => {
  const reply = buildOptimisticReply({
    txid: TXID,
    addr: ADDR,
    text: 'hello',
    seen: 1234,
    blockHeight: 800000,
    displayName: null
  })

  assert.equal(reply.txid, TXID)
  assert.equal(reply.addr, ADDR)
  assert.equal(reply.text, 'hello')
  assert.equal(reply.seen, 1234)
  assert.equal(reply.blockHeight, 800000)
  assert.equal(reply.replyCount, 0)
  assert.deepEqual(reply.replies, [])
  assert.equal(reply.profile, undefined)
})

test('attaches a profile when a display name is present', () => {
  const reply = buildOptimisticReply({
    txid: TXID,
    addr: ADDR,
    text: 'hello',
    seen: 1234,
    blockHeight: undefined,
    displayName: 'Trout'
  })

  assert.deepEqual(reply.profile, { name: 'Trout' })
  assert.equal(reply.blockHeight, undefined)
})

test('preserves an absent block height', () => {
  const reply = buildOptimisticReply({
    txid: TXID,
    addr: ADDR,
    text: 'hello',
    seen: 1234,
    blockHeight: null,
    displayName: null
  })

  assert.equal(reply.blockHeight, null)
})
