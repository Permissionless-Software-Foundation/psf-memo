/*
  Unit tests for the Memo like wire encoding.

  A like action embeds the liked post's transaction txid as 32 raw bytes in
  little-endian wire order: the reverse of the 64-character display txid. The
  indexer reverses those bytes back into display order, so the client must
  reverse before embedding.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const MemoLike = require('../../src/services/memo-like')

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const POST_TXID = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const WIRE_HEX = 'efcdab8967452301efcdab8967452301efcdab8967452301efcdab8967452301'

function makeWallet () {
  return {
    walletInfo: { cashAddress: MY_ADDRESS },
    utxos: [{ txid: 'utxo', value: 100000 }],
    broadcasts: [],
    async getUtxos () {
      return this.utxos
    },
    async sendOpReturn (msg, prefix, bchOutput = []) {
      this.broadcasts.push({ msg, prefix, bchOutput })
      return 'aa'.repeat(32)
    }
  }
}

test('like broadcasts the post txid in little-endian wire order', async () => {
  const wallet = makeWallet()
  const memoLike = new MemoLike({ wallet })

  await memoLike.like(POST_TXID)

  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, MemoLike.MEMO_LIKE_PREFIX)
  const raw = wallet.broadcasts[0].msg
  assert.equal(Buffer.from(raw).toString('hex'), WIRE_HEX)
})

test('like reflects the post txid in display order on the feed store', async () => {
  const wallet = makeWallet()
  const added = []
  const feed = {
    addLike (like) {
      added.push(like)
    },
    posts: []
  }
  const memoLike = new MemoLike({ wallet, feed })

  await memoLike.like(POST_TXID)

  assert.equal(added.length, 1)
  assert.equal(added[0].postTxid, POST_TXID)
})
