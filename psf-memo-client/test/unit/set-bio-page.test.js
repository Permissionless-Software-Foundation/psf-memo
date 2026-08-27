/*
  Unit tests for the Set Bio page controller.

  The page controller wraps the Memo set-bio behavior, exposes a remaining
  byte count, and navigates to the account page on a successful broadcast.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const SetBioPage = require('../../src/services/set-bio-page')
const MemoSetBio = require('../../src/services/memo-set-bio')

function makeWallet (address = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d') {
  return {
    walletInfo: { cashAddress: address },
    broadcasts: [],
    async getUtxos () {
      return []
    },
    async sendOpReturn (msg, prefix) {
      this.broadcasts.push({ msg, prefix })
      return 'aa'.repeat(32)
    }
  }
}

function makeMemoSetBio () {
  const wallet = makeWallet()
  return new MemoSetBio({ wallet })
}

test('remainingCount returns full byte budget for empty input', () => {
  const page = new SetBioPage({ memoSetBio: makeMemoSetBio(), navigate: () => {} })

  assert.equal(page.remainingCount(), MemoSetBio.MAX_BIO_BYTES)
})

test('remainingCount subtracts the byte length of the input', () => {
  const page = new SetBioPage({ memoSetBio: makeMemoSetBio(), navigate: () => {} })
  page.setInput('hello')

  assert.equal(page.remainingCount(), MemoSetBio.MAX_BIO_BYTES - 5)
})

test('remainingCount counts multi-byte characters correctly', () => {
  const page = new SetBioPage({ memoSetBio: makeMemoSetBio(), navigate: () => {} })
  page.setInput('é')

  assert.equal(page.remainingCount(), MemoSetBio.MAX_BIO_BYTES - 2)
})

test('submit navigates to the account page on success', async () => {
  const navigated = []
  const page = new SetBioPage({
    memoSetBio: makeMemoSetBio(),
    navigate: (path) => navigated.push(path)
  })
  page.setInput('Building on BCH')

  const result = await page.submit()

  assert.equal(result.ok, true)
  assert.deepEqual(navigated, [SetBioPage.ACCOUNT_PATH])
})

test('submit records a validation error for empty input', async () => {
  const page = new SetBioPage({ memoSetBio: makeMemoSetBio(), navigate: () => {} })
  page.setInput('')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'bio_validation')
})

test('submit records a length error for over-long input', async () => {
  const page = new SetBioPage({ memoSetBio: makeMemoSetBio(), navigate: () => {} })
  page.setInput('a'.repeat(MemoSetBio.MAX_BIO_BYTES + 1))

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'bio_length')
})

test('submit surfaces a broadcast failure', async () => {
  const memoSetBio = makeMemoSetBio()
  memoSetBio.wallet.sendOpReturn = async () => { throw new Error('network down') }
  const page = new SetBioPage({ memoSetBio, navigate: () => {} })
  page.setInput('Building on BCH')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'broadcast')
  assert.match(result.message, /network down/)
})

test('submit records a broadcast error when no memo set-bio handler is injected', async () => {
  const page = new SetBioPage({ navigate: () => {} })
  page.setInput('Building on BCH')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'broadcast')
  assert.match(result.message, /Set bio requires a memo set-bio handler/)
})
