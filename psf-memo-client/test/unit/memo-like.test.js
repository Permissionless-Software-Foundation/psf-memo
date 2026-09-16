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

test('like rejects a caller without a wallet', async () => {
  const memoLike = new MemoLike()

  await assert.rejects(() => memoLike.like(POST_TXID), /requires a wallet/)
})

test('like rejects an invalid post txid before broadcasting', async () => {
  const wallet = makeWallet()
  const memoLike = new MemoLike({ wallet })

  await assert.rejects(
    () => memoLike.like('not-a-txid'),
    (err) => err.code === 'like_validation'
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('like rejects a balance below the dust limit', async () => {
  const wallet = makeWallet()
  wallet.utxos = [{ txid: 'utxo', value: 100 }]
  const memoLike = new MemoLike({ wallet })

  await assert.rejects(
    () => memoLike.like(POST_TXID),
    (err) => err.code === 'like_empty_balance'
  )
})

test('like rejects a tip that exceeds the spendable balance', async () => {
  const wallet = makeWallet()
  wallet.utxos = [{ txid: 'utxo', value: 3000 }]
  const memoLike = new MemoLike({ wallet })

  await assert.rejects(
    () => memoLike.like(POST_TXID, 4000, MY_ADDRESS),
    (err) => err.code === 'like_balance'
  )
})

test('like requires an author address when a tip is present', async () => {
  const wallet = makeWallet()
  const memoLike = new MemoLike({ wallet })

  await assert.rejects(
    () => memoLike.like(POST_TXID, 1000),
    (err) => err.code === 'like_validation'
  )
})

test('_validateTipAmount rejects a non-integer or negative tip', () => {
  const memoLike = new MemoLike()

  assert.throws(() => memoLike._validateTipAmount(1.5), (err) => err.code === 'like_validation')
  assert.throws(() => memoLike._validateTipAmount(-1), (err) => err.code === 'like_validation')
})

test('_validateTipAmount rejects a tip below the dust limit', () => {
  const memoLike = new MemoLike()

  assert.throws(() => memoLike._validateTipAmount(1), (err) => err.code === 'like_dust')
})

test('_validateTipAmount rejects a tip above the maximum', () => {
  const memoLike = new MemoLike()

  assert.throws(
    () => memoLike._validateTipAmount(MemoLike.MAX_TIP_SATS + 1),
    (err) => err.code === 'like_maximum'
  )
})

test('_validateTipAmount accepts zero and a valid tip', () => {
  const memoLike = new MemoLike()

  assert.equal(memoLike._validateTipAmount(0), undefined)
  assert.equal(memoLike._validateTipAmount(1000), undefined)
})

test('getSpendableSats sums the utxoStore bchUtxos shape', () => {
  const wallet = {
    utxos: { utxoStore: { bchUtxos: [{ satoshis: 1000 }, { amount: 500 }] } }
  }
  const memoLike = new MemoLike({ wallet })

  assert.equal(memoLike.getSpendableSats(), 1500)
})

test('getSpendableSats is zero without a wallet', () => {
  assert.equal(new MemoLike().getSpendableSats(), 0)
})

test('like includes a tip output and reflects the tip on the feed', async () => {
  const wallet = makeWallet()
  const added = []
  const feed = {
    addLike (like) {
      added.push(like)
    },
    posts: [{ txid: POST_TXID, likeCount: 2 }]
  }
  const memoLike = new MemoLike({ wallet, feed })

  await memoLike.like(POST_TXID, 1000, MY_ADDRESS)

  assert.deepEqual(wallet.broadcasts[0].bchOutput, [{ address: MY_ADDRESS, amountSat: 1000 }])
  assert.equal(added[0].tipSats, 1000)
  assert.equal(feed.posts[0].likeCount, 3)
})

test('_buildTipOutput omits the output for a zero tip', () => {
  const memoLike = new MemoLike()

  assert.deepEqual(memoLike._buildTipOutput(0, MY_ADDRESS), [])
})
