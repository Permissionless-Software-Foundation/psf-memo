/*
  Unit tests for the Like / Tip page behavior slice
  (src/services/like-tip-page.js).

  These tests express the page-level behavior described by
  specs/like-tip-memo.feature:
    - opening the modal for a post checks the wallet balance.
    - submitting a like without a tip broadcasts the Memo like action.
    - submitting a like with a tip broadcasts the action and the tip.
    - invalid, dust, maximum, and balance errors are surfaced.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const LikeTipPage = require('../../src/services/like-tip-page')
const MemoLike = require('../../src/services/memo-like')
const { fakeWallet } = require('../helpers/fake-wallet')

const POST_TXID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const AUTHOR_ADDRESS = 'bitcoincash:qz7v6ztvzu2f2xd2ww8pnx9vwk0g4ncvfvavktg0jc'
const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

function build () {
  const wallet = fakeWallet({ cashAddress: MY_ADDRESS, utxos: [{ txid: 'u1', value: 100000 }] })
  const feed = { posts: [], likes: [], addLike: (l) => feed.likes.push(l) }
  const memoLike = new MemoLike({ wallet, feed })
  const page = new LikeTipPage({ memoLike })
  return { wallet, feed, memoLike, page }
}

// Build a page with the given wallet balance, submit a tip string, and assert
// that the submit is rejected with the expected error code and message.
async function assertTipRejected (utxos, tip, expectedCode, messageRe) {
  const wallet = fakeWallet({ cashAddress: MY_ADDRESS, utxos })
  const memoLike = new MemoLike({ wallet })
  const page = new LikeTipPage({ memoLike })
  page.open(POST_TXID, AUTHOR_ADDRESS)
  page.setTip(tip)

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, expectedCode)
  assert.match(page.broadcastError, messageRe)
  assert.equal(wallet.broadcasts.length, 0)
}

test('opening the modal sets the target post and author', () => {
  const { page } = build()

  const result = page.open(POST_TXID, AUTHOR_ADDRESS)

  assert.equal(result.ok, true)
  assert.equal(page.modalOpen, true)
  assert.equal(page.postTxid, POST_TXID)
  assert.equal(page.authorAddress, AUTHOR_ADDRESS)
})

test('opening the modal with insufficient balance surfaces an add-BCH error', () => {
  const wallet = fakeWallet({ cashAddress: MY_ADDRESS, utxos: [] })
  const memoLike = new MemoLike({ wallet })
  const page = new LikeTipPage({ memoLike })

  const result = page.open(POST_TXID, AUTHOR_ADDRESS)

  assert.equal(result.ok, false)
  assert.equal(result.error, 'like_empty_balance')
  assert.equal(page.submitError, 'like_empty_balance')
  assert.match(page.broadcastError, /add BCH/i)
  assert.equal(page.modalOpen, true)
})

test('opening the modal without a memo-like handler surfaces an error', () => {
  const page = new LikeTipPage({})

  const result = page.open(POST_TXID, AUTHOR_ADDRESS)

  assert.equal(result.ok, false)
  assert.equal(result.error, 'like_validation')
  assert.match(page.broadcastError, /memo like/i)
})

test('closing the modal resets input and errors', () => {
  const { page } = build()
  page.open(POST_TXID, AUTHOR_ADDRESS)
  page.setTip('5000')
  page.submitError = 'like_dust'
  page.broadcastError = 'some error'

  page.close()

  assert.equal(page.modalOpen, false)
  assert.equal(page.input, '')
  assert.equal(page.submitError, null)
  assert.equal(page.broadcastError, null)
})

test('submitting a pure like broadcasts the Memo like prefix', async () => {
  const { wallet, page } = build()
  page.open(POST_TXID, AUTHOR_ADDRESS)

  const result = await page.submit()

  assert.equal(result.ok, true)
  assert.equal(page.tipping, false)
  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, '6d04')
  assert.deepEqual(wallet.broadcasts[0].bchOutput, [])
})

test('submitting a like with a tip broadcasts the prefix and the tip output', async () => {
  const { wallet, page } = build()
  page.open(POST_TXID, AUTHOR_ADDRESS)
  page.setTip('3000')

  const result = await page.submit()

  assert.equal(result.ok, true)
  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, '6d04')
  assert.deepEqual(wallet.broadcasts[0].bchOutput, [{ address: AUTHOR_ADDRESS, amountSat: 3000 }])
})

test('submitting a like on a post authored by the wallet works without a tip', async () => {
  const { wallet, page } = build()
  page.open(POST_TXID, MY_ADDRESS)

  const result = await page.submit()

  assert.equal(result.ok, true)
  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, '6d04')
})

test('submitting with a non-numeric tip string is rejected', async () => {
  for (const tip of ['abc', '1.5']) {
    const { wallet, page } = build()
    page.open(POST_TXID, AUTHOR_ADDRESS)
    page.setTip(tip)

    const result = await page.submit()

    assert.equal(result.ok, false)
    assert.equal(result.error, 'like_validation')
    assert.equal(page.submitError, 'like_validation')
    assert.match(page.broadcastError, /valid number/i)
    assert.equal(wallet.broadcasts.length, 0)
  }
})

test('submitting with a dust tip is rejected', async () => {
  const { wallet, page } = build()
  page.open(POST_TXID, AUTHOR_ADDRESS)
  page.setTip('599')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'like_dust')
  assert.equal(wallet.broadcasts.length, 0)
})

test('submitting with a tip above the maximum is rejected', async () => {
  await assertTipRejected(
    [{ txid: 'u1', value: 150000000 }],
    '100000001',
    'like_maximum',
    /maximum/i
  )
})

test('submitting with a tip above the spendable balance is rejected', async () => {
  await assertTipRejected(
    [{ txid: 'u1', value: 30000 }],
    '35000',
    'like_balance',
    /spendable/i
  )
})

test('tipping flag is true while a submit is in flight and false once it settles', async () => {
  const { wallet, page } = build()
  page.open(POST_TXID, AUTHOR_ADDRESS)

  let resolveSend
  wallet.sendOpReturn = async () => new Promise((resolve) => { resolveSend = resolve })

  assert.equal(page.tipping, false)
  const pending = page.submit()
  assert.equal(page.tipping, true)

  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(typeof resolveSend, 'function')
  resolveSend('in-flight-txid')
  await pending
  assert.equal(page.tipping, false)
})

test('submitting without a memo-like handler reports an error', async () => {
  const page = new LikeTipPage({})
  page.open(POST_TXID, AUTHOR_ADDRESS)

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(page.submitError, 'broadcast')
  assert.match(page.broadcastError, /memo like/i)
})

test('a failed broadcast surfaces the real error', async () => {
  const wallet = fakeWallet({ cashAddress: MY_ADDRESS })
  wallet.failWith = 'Insufficient balance'
  const memoLike = new MemoLike({ wallet })
  const page = new LikeTipPage({ memoLike })
  page.open(POST_TXID, AUTHOR_ADDRESS)

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(page.submitError, 'broadcast')
  assert.match(page.broadcastError, /Insufficient balance/)
})

test('a submit failure with no error message surfaces the error name', async () => {
  const wallet = fakeWallet({ cashAddress: MY_ADDRESS })
  const memoLike = new MemoLike({ wallet })
  memoLike.like = async () => { throw new Error('') }
  const page = new LikeTipPage({ memoLike })
  page.open(POST_TXID, AUTHOR_ADDRESS)

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(page.submitError, 'broadcast')
  assert.equal(page.broadcastError, 'Error')
})
