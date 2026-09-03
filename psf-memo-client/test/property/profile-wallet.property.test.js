/*
  Property tests for the profile page wallet-address selector.

  The unit tests check getViewerAddress at a few fixed shapes. These
  properties pin the precedence invariant over a broad input space:

    - precedence: whenever the reactive bchWalletState.cashAddress is a truthy
      value it is returned, regardless of the wallet-field address.
    - fallback: when the reactive state carries no truthy address, the wallet
      object's walletInfo.cashAddress is used when present.
    - absence: when neither source has an address, the result is null, never a
      partial/empty object.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen } = require('./harness')
const { getViewerAddress } = require('../../src/services/profile-wallet')

const rng = seededRandom(20260903)
const CHARS = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'

// Random cash-address-shaped string (never empty so it passes as truthy).
function addressGen () {
  const len = intGen(rng, 40, 60)()
  let out = 'bitcoincash:q'
  for (let i = 0; i < len; i++) {
    out += CHARS[Math.floor(rng() * CHARS.length)]
  }
  return out
}

// Pick a "reactive state address" which may be falsy (undefined/null/'') or a
// real address string.
function stateAddrGen () {
  const roll = rng()
  if (roll < 0.2) return undefined
  if (roll < 0.4) return null
  if (roll < 0.55) return ''
  return addressGen()
}

// Build a wallet field: absent, present without an address, or present with a
// randomly chosen address.
function walletGen () {
  const roll = rng()
  if (roll < 0.25) return undefined
  if (roll < 0.4) return { walletInfo: {} }
  return { walletInfo: { cashAddress: addressGen() } }
}

function buildAppData (stateAddr, wallet) {
  return {
    bchWalletState: { cashAddress: stateAddr },
    wallet,
    profiles: {}
  }
}

function expectedGet (stateAddr, wallet) {
  if (stateAddr) return stateAddr
  if (wallet && wallet.walletInfo && wallet.walletInfo.cashAddress) {
    return wallet.walletInfo.cashAddress
  }
  return null
}

function fixtureGen () {
  return () => ({
    stateAddr: stateAddrGen(),
    wallet: walletGen()
  })
}

const gen = fixtureGen()

test('getViewerAddress matches the reactive-then-wallet precedence rule', async () => {
  await forAll(
    gen,
    ({ stateAddr, wallet }) => {
      const appData = buildAppData(stateAddr, wallet)
      return getViewerAddress(appData) === expectedGet(stateAddr, wallet)
    },
    { label: 'getViewerAddress precedence' }
  )
})

test('getViewerAddress prefers the reactive state whenever it is truthy', async () => {
  await forAll(
    gen,
    ({ stateAddr, wallet }) => {
      if (!stateAddr) return true
      const appData = buildAppData(stateAddr, wallet)
      return getViewerAddress(appData) === stateAddr
    },
    { label: 'getViewerAddress reactive preference invariant' }
  )
})

test('getViewerAddress returns null when no wallet address is available', async () => {
  await forAll(
    gen,
    ({ stateAddr, wallet }) => {
      if (expectedGet(stateAddr, wallet) !== null) return true
      const appData = buildAppData(stateAddr, wallet)
      return getViewerAddress(appData) === null
    },
    { label: 'getViewerAddress null-on-absent invariant' }
  )
})
