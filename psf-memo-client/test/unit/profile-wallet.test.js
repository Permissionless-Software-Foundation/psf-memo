/*
  Unit tests for the profile wallet address selector.

  The profile page must show follow/mute controls only when the viewer's
  wallet address is known. The React app tracks the loaded address both in the
  wallet object and in `bchWalletState`; the selector prefers the reactive
  state so the profile reloads when the address becomes available.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { getViewerAddress } = require('../../src/services/profile-wallet')

function makeAppData ({ bchCashAddress, walletCashAddress } = {}) {
  return {
    bchWalletState: {
      cashAddress: bchCashAddress
    },
    wallet: walletCashAddress
      ? { walletInfo: { cashAddress: walletCashAddress } }
      : null,
    profiles: {}
  }
}

test('getViewerAddress prefers bchWalletState.cashAddress', () => {
  const appData = makeAppData({
    bchCashAddress: 'bitcoincash:state-address',
    walletCashAddress: 'bitcoincash:wallet-address'
  })

  assert.equal(getViewerAddress(appData), 'bitcoincash:state-address')
})

test('getViewerAddress falls back to wallet.walletInfo.cashAddress', () => {
  const appData = makeAppData({
    bchCashAddress: undefined,
    walletCashAddress: 'bitcoincash:wallet-address'
  })

  assert.equal(getViewerAddress(appData), 'bitcoincash:wallet-address')
})

test('getViewerAddress returns null when no wallet is loaded', () => {
  const appData = makeAppData({})

  assert.equal(getViewerAddress(appData), null)
})

test('getViewerAddress returns null when wallet lacks an address', () => {
  const appData = {
    bchWalletState: {},
    wallet: { walletInfo: {} },
    profiles: {}
  }

  assert.equal(getViewerAddress(appData), null)
})
