/*
  Unit tests for the Memo like/tip behavior slice (src/services/memo-like.js).

  These tests express the observable behavior described by
  specs/like-tip-memo.feature:
    - a valid like broadcasts an OP_RETURN transaction carrying the Memo like
      prefix (0x6d04) and the post txid bytes; an optional tip is included as a
      BCH output to the author address.
    - an invalid/non-integer tip is rejected with a validation error.
    - a tip below the dust limit is rejected.
    - a tip above the hard maximum is rejected.
    - a tip above the spendable balance is rejected.
    - a wallet without spendable balance cannot like.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const MemoLike = require('../../src/services/memo-like')
const { fakeWallet } = require('../helpers/fake-wallet')

const POST_TXID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const AUTHOR_ADDRESS = 'bitcoincash:qz7v6ztvzu2f2xd2ww8pnx9vwk0g4ncvfvavktg0jc'
const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

// A fake feed that records likes and exposes posts keyed by txid.
function fakeFeed (posts = []) {
  const likes = []
  return {
    posts,
    likes,
    addLike: (l) => likes.push(l)
  }
}

// Decode a like payload back into the canonical 64-character hex txid.
function decodeLikeTxid (raw) {
  return Buffer.from(raw).toString('hex')
}

// Assert that a like with the given post txid and tip rejects with a specific
// error code and performs no broadcast.
async function assertLikeRejected (wallet, tip, expectedCode, postTxid = POST_TXID) {
  const memoLike = new MemoLike({ wallet })
  await assert.rejects(
    memoLike.like(postTxid, tip, AUTHOR_ADDRESS),
    (err) => err.code === expectedCode
  )
  assert.equal(wallet.broadcasts.length, 0)
}

test('MEMO_LIKE_PREFIX is the Memo like action 0x6d04', () => {
  assert.equal(MemoLike.MEMO_LIKE_PREFIX, '6d04')
})

test('DUST_LIMIT_SATS is 3000', () => {
  assert.equal(MemoLike.DUST_LIMIT_SATS, 3000)
})

test('DUST_TIP_SATS is 600', () => {
  assert.equal(MemoLike.DUST_TIP_SATS, 600)
})

test('MAX_TIP_SATS is 100000000', () => {
  assert.equal(MemoLike.MAX_TIP_SATS, 100000000)
})

test('liking a post without a tip broadcasts an OP_RETURN with the Memo like prefix and txid', async () => {
  const wallet = fakeWallet({ cashAddress: MY_ADDRESS })
  const feed = fakeFeed([{ txid: POST_TXID, addr: AUTHOR_ADDRESS, likeCount: 0 }])
  const memoLike = new MemoLike({ wallet, feed })

  const txid = await memoLike.like(POST_TXID, 0, AUTHOR_ADDRESS)

  assert.equal(txid, 'fake-txid')
  assert.equal(wallet.broadcasts.length, 1)
  const b = wallet.broadcasts[0]
  assert.equal(b.prefix, '6d04')
  assert.ok(b.msg instanceof Uint8Array)
  assert.equal(decodeLikeTxid(b.msg), POST_TXID)
  assert.deepEqual(b.bchOutput, [])

  // The feed reflects the like.
  assert.equal(feed.likes.length, 1)
  assert.equal(feed.likes[0].postTxid, POST_TXID)
  assert.equal(feed.likes[0].address, MY_ADDRESS)
  assert.equal(feed.likes[0].tipSats, 0)
  assert.equal(feed.posts[0].likeCount, 1)
})

test('liking a post with a tip broadcasts an OP_RETURN and a tip output', async () => {
  const wallet = fakeWallet({ cashAddress: MY_ADDRESS, utxos: [{ txid: 'u1', value: 100000 }] })
  const feed = fakeFeed([{ txid: POST_TXID, addr: AUTHOR_ADDRESS, likeCount: 5 }])
  const memoLike = new MemoLike({ wallet, feed })

  const txid = await memoLike.like(POST_TXID, 3000, AUTHOR_ADDRESS)

  assert.equal(txid, 'fake-txid')
  assert.equal(wallet.broadcasts.length, 1)
  const b = wallet.broadcasts[0]
  assert.equal(b.prefix, '6d04')
  assert.equal(decodeLikeTxid(b.msg), POST_TXID)
  assert.deepEqual(b.bchOutput, [{ address: AUTHOR_ADDRESS, amountSat: 3000 }])

  // The feed reflects the like.
  assert.equal(feed.likes.length, 1)
  assert.equal(feed.likes[0].tipSats, 3000)
  assert.equal(feed.posts[0].likeCount, 6)
})

test('liking without a wallet reports a missing-wallet error', async () => {
  const memoLike = new MemoLike({})

  await assert.rejects(
    memoLike.like(POST_TXID),
    (err) => /wallet/i.test(err.message)
  )
})

test('liking with an invalid post txid reports a clear validation error', async () => {
  await assertLikeRejected(fakeWallet(), 0, 'like_validation', 'not-a-txid')
})

test('liking with a wrong-length but valid-hex post txid is rejected', async () => {
  await assertLikeRejected(fakeWallet(), 0, 'like_validation', 'a'.repeat(10))
})

test('a non-integer tip like "1.5" is rejected with a validation error', async () => {
  await assertLikeRejected(fakeWallet(), 1.5, 'like_validation')
})

test('a non-numeric tip like "abc" is rejected with a validation error', async () => {
  await assertLikeRejected(fakeWallet(), NaN, 'like_validation')
})

test('a negative tip is rejected with a validation error', async () => {
  await assertLikeRejected(fakeWallet(), -1, 'like_validation')
})

test('a tip below the tip dust limit is rejected with a dust error', async () => {
  const wallet = fakeWallet({ utxos: [{ txid: 'u1', value: 100000 }] })
  await assertLikeRejected(wallet, 1, 'like_dust')
  await assertLikeRejected(wallet, 599, 'like_dust')
})

test('a tip at the tip dust limit is accepted', async () => {
  const wallet = fakeWallet({ utxos: [{ txid: 'u1', value: 100000 }] })
  const memoLike = new MemoLike({ wallet })

  const txid = await memoLike.like(POST_TXID, 600, AUTHOR_ADDRESS)

  assert.equal(txid, 'fake-txid')
  assert.equal(wallet.broadcasts.length, 1)
  assert.deepEqual(wallet.broadcasts[0].bchOutput, [
    { address: AUTHOR_ADDRESS, amountSat: 600 }
  ])
})

test('a tip above the hard maximum is rejected with a maximum error', async () => {
  await assertLikeRejected(
    fakeWallet({ utxos: [{ txid: 'u1', value: 150000000 }] }),
    100000001,
    'like_maximum'
  )
})

test('a tip at exactly the hard maximum is accepted', async () => {
  const wallet = fakeWallet({
    cashAddress: MY_ADDRESS,
    utxos: [{ txid: 'u1', value: MemoLike.MAX_TIP_SATS + 1000 }]
  })
  const memoLike = new MemoLike({ wallet })

  const txid = await memoLike.like(POST_TXID, MemoLike.MAX_TIP_SATS, AUTHOR_ADDRESS)

  assert.equal(txid, 'fake-txid')
  assert.equal(wallet.broadcasts.length, 1)
  assert.deepEqual(wallet.broadcasts[0].bchOutput, [
    { address: AUTHOR_ADDRESS, amountSat: MemoLike.MAX_TIP_SATS }
  ])
})

test('a wallet with exactly the dust-limit balance can make a pure like', async () => {
  const wallet = fakeWallet({
    cashAddress: MY_ADDRESS,
    utxos: [{ txid: 'u1', value: MemoLike.DUST_LIMIT_SATS }]
  })
  const memoLike = new MemoLike({ wallet })

  const txid = await memoLike.like(POST_TXID, 0, AUTHOR_ADDRESS)

  assert.equal(txid, 'fake-txid')
  assert.equal(wallet.broadcasts.length, 1)
})

test('a tip above the spendable balance is rejected with a balance error', async () => {
  await assertLikeRejected(
    fakeWallet({ utxos: [{ txid: 'u1', value: 30000 }] }),
    35000,
    'like_balance'
  )
})

test('a tip at exactly the spendable balance is accepted', async () => {
  const wallet = fakeWallet({
    cashAddress: MY_ADDRESS,
    utxos: [{ txid: 'u1', value: 25000 }]
  })
  const memoLike = new MemoLike({ wallet })

  const txid = await memoLike.like(POST_TXID, 25000, AUTHOR_ADDRESS)

  assert.equal(txid, 'fake-txid')
  assert.equal(wallet.broadcasts.length, 1)
})

test('a wallet with zero spendable balance cannot like', async () => {
  await assertLikeRejected(fakeWallet({ utxos: [] }), 0, 'like_empty_balance')
})

test('a wallet with balance below the dust limit cannot like', async () => {
  await assertLikeRejected(
    fakeWallet({ utxos: [{ txid: 'u1', value: 2999 }] }),
    0,
    'like_empty_balance'
  )
})

test('a pure like can be made on a post authored by the wallet address', async () => {
  const wallet = fakeWallet({ cashAddress: MY_ADDRESS })
  const feed = fakeFeed([{ txid: POST_TXID, addr: MY_ADDRESS, likeCount: 0 }])
  const memoLike = new MemoLike({ wallet, feed })

  const txid = await memoLike.like(POST_TXID, 0, MY_ADDRESS)

  assert.equal(txid, 'fake-txid')
  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, '6d04')
  assert.equal(feed.posts[0].likeCount, 1)
})

test('a tip requires an author address', async () => {
  const wallet = fakeWallet({ utxos: [{ txid: 'u1', value: 100000 }] })
  const memoLike = new MemoLike({ wallet })

  await assert.rejects(
    memoLike.like(POST_TXID, 3000),
    (err) => err.code === 'like_validation'
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('getSpendableSats tolerates common utxo value field names', () => {
  const walletValue = fakeWallet({ utxos: [{ txid: 'u1', value: 1000 }] })
  const walletSatoshis = fakeWallet({ utxos: [{ txid: 'u2', satoshis: 2000 }] })
  const walletAmount = fakeWallet({ utxos: [{ txid: 'u3', amount: 3000 }] })

  assert.equal(new MemoLike({ wallet: walletValue }).getSpendableSats(), 1000)
  assert.equal(new MemoLike({ wallet: walletSatoshis }).getSpendableSats(), 2000)
  assert.equal(new MemoLike({ wallet: walletAmount }).getSpendableSats(), 3000)
})

test('getSpendableSats returns 0 without a wallet or spendable values', () => {
  assert.equal(new MemoLike({}).getSpendableSats(), 0)
  assert.equal(new MemoLike({ wallet: { utxos: undefined } }).getSpendableSats(), 0)
  assert.equal(new MemoLike({ wallet: { utxos: [{ txid: 'u1' }] } }).getSpendableSats(), 0)
})

test('getSpendableSats reads spendable BCH outputs from the wallet UtxoStore object', () => {
  // minimal-slp-wallet exposes wallet.utxos as a UtxoStore object whose
  // spendable BCH outputs live under utxoStore.bchUtxos.
  const utxoStore = {
    utxoStore: {
      bchUtxos: [
        { txid: 'u1', satoshis: 1500 },
        { txid: 'u2', value: 2000 },
        { txid: 'u3', satoshis: 2500 }
      ],
      slpUtxos: { type1: { tokens: [] }, nft: [] }
    }
  }
  const wallet = fakeWallet({ utxos: utxoStore })

  assert.equal(new MemoLike({ wallet }).getSpendableSats(), 6000)
})

test('getSpendableSats returns 0 for an empty UtxoStore object', () => {
  const wallet = fakeWallet({ utxos: { utxoStore: { bchUtxos: [] } } })

  assert.equal(new MemoLike({ wallet }).getSpendableSats(), 0)
})
