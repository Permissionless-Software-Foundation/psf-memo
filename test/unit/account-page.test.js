/*
  Unit tests for the Account Page behavior slice (src/services/account-page.js).

  Expresses the observable behavior described by specs/set-name.feature:
    - the account page shows the authenticated user's display name.
    - the account page exposes a Set Name button.
    - clicking the Set Name button navigates to /memo/set-name.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const AccountPage = require('../../src/services/account-page')

const ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

function fakeWallet (cashAddress = ADDRESS) {
  return { walletInfo: { cashAddress } }
}

function fakeProfiles (initial = {}) {
  const names = { ...initial }
  return { names, setName: (addr, name) => { names[addr] = name }, getName: (addr) => names[addr] || null }
}

function build (deps = {}) {
  const wallet = deps.wallet !== undefined ? deps.wallet : fakeWallet()
  const profiles = deps.profiles !== undefined ? deps.profiles : fakeProfiles()
  const navigations = []
  const page = new AccountPage({
    wallet,
    profiles,
    navigate: (path) => navigations.push(path)
  })
  return { page, navigations, profiles }
}

test('SET_NAME_PATH and ACCOUNT_PATH constants', () => {
  assert.equal(AccountPage.SET_NAME_PATH, '/memo/set-name')
  assert.equal(AccountPage.ACCOUNT_PATH, '/account')
})

test('the account page shows a Set Name button', () => {
  const { page } = build()
  assert.equal(page.hasSetNameButton(), true)
})

test('clicking the Set Name button navigates to /memo/set-name', () => {
  const { page, navigations } = build()
  page.clickSetName()
  assert.deepEqual(navigations, ['/memo/set-name'])
})

test('the account page shows the stored name for the authenticated address', () => {
  const profiles = fakeProfiles({ [ADDRESS]: 'trout' })
  const { page } = build({ profiles })
  assert.equal(page.getName(), 'trout')
})

test('the account page returns null when no name is stored', () => {
  const { page } = build()
  assert.equal(page.getName(), null)
})

test('the account page returns null when no wallet is present', () => {
  const { page } = build({ wallet: null })
  assert.equal(page.getName(), null)
})

test('the account page returns null when no profile store is present', () => {
  const { page } = build({ profiles: null })
  assert.equal(page.getName(), null)
})
