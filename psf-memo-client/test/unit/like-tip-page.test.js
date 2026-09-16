/*
  Unit tests for the like/tip page controller's broadcast result.

  After a like is broadcast, the like/tip modal no longer closes
  automatically. The controller records the successful result and keeps the
  modal open so the modal can show a broadcast result (message, txid, and
  explorer link). Dismissing the result closes the modal.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const LikeTipPage = require('../../src/services/like-tip-page')
const MemoLike = require('../../src/services/memo-like')

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const AUTHOR_ADDRESS = 'bitcoincash:qz7v6ztvzu2f2xd2ww8pnx9vwk0g4ncvfvavktg0jc'
const SAMPLE_TXID = '1111111111111111111111111111111111111111111111111111111111111111'
const LIKE_TXID = 'ab'.repeat(32)

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
      if (this.failWith) throw new Error(this.failWith)
      return LIKE_TXID
    }
  }
}

function makePage (opts = {}) {
  const wallet = makeWallet()
  if (opts.failWith) wallet.failWith = opts.failWith
  const memoLike = new MemoLike({ wallet })
  return { wallet, page: new LikeTipPage({ memoLike }) }
}

test('the result modal starts hidden', () => {
  const { page } = makePage()

  assert.equal(page.showResultModal, false)
  assert.equal(page.lastResult, null)
})

test('explorerUrl builds a bch.loping.net transaction link', () => {
  assert.equal(
    LikeTipPage.explorerUrl(SAMPLE_TXID),
    `https://bch.loping.net/tx/${SAMPLE_TXID}`
  )
  assert.equal(LikeTipPage.explorerUrl(''), '')

  const { page } = makePage()
  assert.equal(page.explorerUrl(SAMPLE_TXID), LikeTipPage.explorerUrl(SAMPLE_TXID))
})

test('SUCCESS_MESSAGE announces the broadcast', () => {
  assert.equal(typeof LikeTipPage.SUCCESS_MESSAGE, 'string')
  assert.match(LikeTipPage.SUCCESS_MESSAGE, /broadcast/i)
})

test('a successful like keeps the modal open and shows the result', async () => {
  const { page } = makePage()
  page.open(SAMPLE_TXID, AUTHOR_ADDRESS)
  page.setTip('')

  const result = await page.submit()

  assert.equal(result.ok, true)
  assert.equal(result.txid, LIKE_TXID)
  assert.equal(page.modalOpen, true)
  assert.equal(page.showResultModal, true)
  assert.equal(page.lastResult.txid, LIKE_TXID)
  assert.equal(page.getBroadcastMessage(), LikeTipPage.SUCCESS_MESSAGE)
})

test('dismissing the result closes the like/tip modal', async () => {
  const { page } = makePage()
  page.open(SAMPLE_TXID, AUTHOR_ADDRESS)
  page.setTip('')
  await page.submit()

  page.dismissResult()

  assert.equal(page.showResultModal, false)
  assert.equal(page.modalOpen, false)
})

test('opening the modal clears any previous result', async () => {
  const { page } = makePage()
  page.open(SAMPLE_TXID, AUTHOR_ADDRESS)
  page.setTip('')
  await page.submit()

  page.open(SAMPLE_TXID, AUTHOR_ADDRESS)

  assert.equal(page.showResultModal, false)
  assert.equal(page.lastResult, null)
})

test('a validation failure stays on the form and opens no result', async () => {
  const { page } = makePage()
  page.open(SAMPLE_TXID, AUTHOR_ADDRESS)
  page.setTip('abc')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'like_validation')
  assert.equal(page.modalOpen, true)
  assert.equal(page.showResultModal, false)
  assert.equal(page.lastResult.ok, false)
})

test('a broadcast failure stays on the form and opens no result', async () => {
  const { page } = makePage({ failWith: 'Insufficient balance' })
  page.open(SAMPLE_TXID, AUTHOR_ADDRESS)
  page.setTip('')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'broadcast')
  assert.match(page.broadcastError, /Insufficient balance/)
  assert.equal(page.modalOpen, true)
  assert.equal(page.showResultModal, false)
  assert.equal(page.getBroadcastMessage(), '')
})
