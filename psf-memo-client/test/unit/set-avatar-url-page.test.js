/*
  Unit tests for the Set Avatar URL page controller.

  The page controller wraps the Memo set-avatar-url behavior, exposes a
  remaining byte count, and navigates to the account page on a successful
  broadcast.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const SetAvatarUrlPage = require('../../src/services/set-avatar-url-page')
const MemoSetAvatarUrl = require('../../src/services/memo-set-avatar-url')

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

function makeMemoSetAvatarUrl () {
  const wallet = makeWallet()
  return new MemoSetAvatarUrl({ wallet })
}

test('the in-flight flag starts false', () => {
  const page = new SetAvatarUrlPage({ navigate: () => {} })

  assert.equal(page.settingAvatarUrl, false)
})

test('remainingCount returns full byte budget for empty input', () => {
  const page = new SetAvatarUrlPage({ memoSetAvatarUrl: makeMemoSetAvatarUrl(), navigate: () => {} })

  assert.equal(page.remainingCount(), MemoSetAvatarUrl.MAX_AVATAR_URL_BYTES)
})

test('remainingCount subtracts the byte length of the input', () => {
  const page = new SetAvatarUrlPage({ memoSetAvatarUrl: makeMemoSetAvatarUrl(), navigate: () => {} })
  page.setInput('https://a.io/p.png')

  assert.equal(page.remainingCount(), MemoSetAvatarUrl.MAX_AVATAR_URL_BYTES - 18)
})

test('remainingCount counts multi-byte characters correctly', () => {
  const page = new SetAvatarUrlPage({ memoSetAvatarUrl: makeMemoSetAvatarUrl(), navigate: () => {} })
  page.setInput('é')

  assert.equal(page.remainingCount(), MemoSetAvatarUrl.MAX_AVATAR_URL_BYTES - 2)
})

test('submit navigates to the account page on success', async () => {
  const navigated = []
  const page = new SetAvatarUrlPage({
    memoSetAvatarUrl: makeMemoSetAvatarUrl(),
    navigate: (path) => navigated.push(path)
  })
  page.setInput('https://example.com/avatar.png')

  const result = await page.submit()

  assert.equal(result.ok, true)
  assert.deepEqual(navigated, [SetAvatarUrlPage.ACCOUNT_PATH])
})

test('submit records a validation error for empty input', async () => {
  const page = new SetAvatarUrlPage({ memoSetAvatarUrl: makeMemoSetAvatarUrl(), navigate: () => {} })
  page.setInput('')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'avatar_url_validation')
})

test('submit records a length error for over-long input', async () => {
  const page = new SetAvatarUrlPage({ memoSetAvatarUrl: makeMemoSetAvatarUrl(), navigate: () => {} })
  page.setInput('a'.repeat(MemoSetAvatarUrl.MAX_AVATAR_URL_BYTES + 1))

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'avatar_url_length')
})

test('submit surfaces a broadcast failure', async () => {
  const memoSetAvatarUrl = makeMemoSetAvatarUrl()
  memoSetAvatarUrl.wallet.sendOpReturn = async () => { throw new Error('network down') }
  const page = new SetAvatarUrlPage({ memoSetAvatarUrl, navigate: () => {} })
  page.setInput('https://example.com/avatar.png')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'broadcast')
  assert.match(result.message, /network down/)
})

test('submit records a broadcast error when no memo set-avatar-url handler is injected', async () => {
  const page = new SetAvatarUrlPage({ navigate: () => {} })
  page.setInput('https://example.com/avatar.png')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'broadcast')
  assert.match(result.message, /Set avatar URL requires a memo set-avatar-url handler/)
})
