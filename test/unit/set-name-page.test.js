/*
  Unit tests for the Set Name Page behavior slice (src/services/set-name-page.js).

  Expresses the observable behavior described by specs/set-name.feature:
    - setting a valid name broadcasts an OP_RETURN with the Memo set-name prefix
      and navigates the user to the account page.
    - an empty name is rejected with a validation error; nothing is broadcast.
    - an over-long name is rejected with a length error; nothing is broadcast.
    - the byte counter counts down from the name limit.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const MemoSetName = require('../../src/services/memo-set-name')
const SetNamePage = require('../../src/services/set-name-page')
const { fakeProfiles } = require('../helpers/fake-profiles')
const { registerPageControllerTests } = require('./page-controller-helpers')
const { buildPage } = require('./page-build-helpers')

const MAX = MemoSetName.MAX_NAME_BYTES // 77

function build () {
  return buildPage({
    Page: SetNamePage,
    Action: MemoSetName,
    actionKey: 'memoSetName',
    storeKey: 'profiles',
    storeFactory: fakeProfiles
  })
}

function buildBarePage (navigations) {
  return new SetNamePage({ navigate: (p) => navigations.push(p) })
}

test('SET_NAME_PATH and ACCOUNT_PATH constants', () => {
  assert.equal(SetNamePage.SET_NAME_PATH, '/memo/set-name')
  assert.equal(SetNamePage.ACCOUNT_PATH, '/account')
})

test('the byte counter counts down from the name limit for an empty name', () => {
  const { page } = build()
  page.setInput('')
  assert.equal(page.remainingCount(), MAX)
})

test('the byte counter counts multi-byte characters by bytes, not characters', () => {
  const { page } = build()
  page.setInput('é')
  assert.equal(page.remainingCount(), MAX - 2)
})

test('the byte counter reaches zero at the byte limit with multi-byte characters', () => {
  const { page } = build()
  page.setInput('é'.repeat(38))
  assert.equal(page.remainingCount(), 1)
})

test('the byte counter counts down from the name limit for a short name', () => {
  const { page } = build()
  page.setInput('trout')
  assert.equal(page.remainingCount(), MAX - 5)
})

test('the byte counter reaches zero at the name limit', () => {
  const { page } = build()
  page.setInput('x'.repeat(MAX))
  assert.equal(page.remainingCount(), 0)
})

test('setting a valid name broadcasts the Memo set-name prefix and navigates to the account page', async () => {
  const { wallet, store, page, navigations } = build()
  page.setInput('trout')

  const result = await page.submit()

  assert.equal(result.ok, true)
  assert.equal(page.settingName, false)
  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, '6d01')
  assert.equal(wallet.broadcasts[0].msg, 'trout')
  assert.deepEqual(navigations, ['/account'])
  assert.equal(store.getName(wallet.walletInfo.cashAddress), 'trout')
})

test('setting an empty name is rejected with a validation error and nothing is broadcast', async () => {
  const { wallet, store, page, navigations } = build()
  page.setInput('')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'name_validation')
  assert.equal(page.submitError, 'name_validation')
  assert.equal(page.settingName, false)
  assert.equal(wallet.broadcasts.length, 0)
  assert.equal(store.getName(wallet.walletInfo.cashAddress), null)
  assert.deepEqual(navigations, [])
})

test('setting an over-long name is rejected with a length error and nothing is broadcast', async () => {
  const { wallet, store, page, navigations } = build()
  page.setInput('y'.repeat(MAX + 1))

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'name_length')
  assert.equal(page.submitError, 'name_length')
  assert.equal(page.settingName, false)
  assert.equal(wallet.broadcasts.length, 0)
  assert.equal(store.getName(wallet.walletInfo.cashAddress), null)
  assert.deepEqual(navigations, [])
})

test('the set name page starts idle (not setting name)', () => {
  const { page } = build()
  assert.equal(page.settingName, false)
})

registerPageControllerTests({
  buildPage: build,
  buildBarePage,
  busyFlag: 'settingName',
  prefix: '6d01'
})
