/*
  Unit tests for the shared block explorer link.

  The New Post result modal, the post options menu, and the like/tip broadcast
  result all use this module so the explorer base URL and link shape stay in
  one place.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  BLOCK_EXPLORER_TX_BASE,
  blockExplorerTxUrl
} = require('../../src/services/block-explorer')

const SAMPLE_TXID = '1111111111111111111111111111111111111111111111111111111111111111'

test('the block explorer base points at bch.loping.net', () => {
  assert.equal(BLOCK_EXPLORER_TX_BASE, 'https://bch.loping.net/tx')
})

test('blockExplorerTxUrl builds a transaction link', () => {
  assert.equal(
    blockExplorerTxUrl(SAMPLE_TXID),
    `${BLOCK_EXPLORER_TX_BASE}/${SAMPLE_TXID}`
  )
})

test('blockExplorerTxUrl returns an empty string without a txid', () => {
  assert.equal(blockExplorerTxUrl(''), '')
  assert.equal(blockExplorerTxUrl(null), '')
  assert.equal(blockExplorerTxUrl(undefined), '')
})
