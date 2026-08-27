/*
  Unit tests for the account page behavior.

  The account page exposes the authenticated wallet's display name and bio,
  along with buttons that navigate to the set-name and set-bio pages.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const AccountPage = require('../../src/services/account-page')

function makeProfiles () {
  const names = {}
  const bios = {}
  return {
    setName: (addr, name) => { names[addr] = name },
    getName: (addr) => names[addr] || null,
    setBio: (addr, bio) => { bios[addr] = bio },
    getBio: (addr) => bios[addr] || null
  }
}

function makeWallet (address = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d') {
  return { walletInfo: { cashAddress: address } }
}

test('getName returns the stored display name', () => {
  const profiles = makeProfiles()
  const wallet = makeWallet()
  const page = new AccountPage({ wallet, profiles })

  profiles.setName(wallet.walletInfo.cashAddress, 'trout')

  assert.equal(page.getName(), 'trout')
})

test('getName returns null without a wallet', () => {
  const profiles = makeProfiles()
  const page = new AccountPage({ profiles })

  assert.equal(page.getName(), null)
})

test('getName returns null without a profile store', () => {
  const wallet = makeWallet()
  const page = new AccountPage({ wallet })

  assert.equal(page.getName(), null)
})

test('getBio returns the stored bio', () => {
  const profiles = makeProfiles()
  const wallet = makeWallet()
  const page = new AccountPage({ wallet, profiles })

  profiles.setBio(wallet.walletInfo.cashAddress, 'Building on BCH')

  assert.equal(page.getBio(), 'Building on BCH')
})

test('getBio returns null without a wallet', () => {
  const profiles = makeProfiles()
  const page = new AccountPage({ profiles })

  assert.equal(page.getBio(), null)
})

test('getBio returns null without a profile store', () => {
  const wallet = makeWallet()
  const page = new AccountPage({ wallet })

  assert.equal(page.getBio(), null)
})

test('hasSetNameButton is true', () => {
  const page = new AccountPage({})

  assert.equal(page.hasSetNameButton(), true)
})

test('hasSetBioButton is true', () => {
  const page = new AccountPage({})

  assert.equal(page.hasSetBioButton(), true)
})

test('clickSetName navigates to the set-name page', () => {
  const navigated = []
  const page = new AccountPage({ navigate: (path) => navigated.push(path) })

  page.clickSetName()

  assert.deepEqual(navigated, [AccountPage.SET_NAME_PATH])
})

test('clickSetBio navigates to the set-bio page', () => {
  const navigated = []
  const page = new AccountPage({ navigate: (path) => navigated.push(path) })

  page.clickSetBio()

  assert.deepEqual(navigated, [AccountPage.SET_BIO_PATH])
})
