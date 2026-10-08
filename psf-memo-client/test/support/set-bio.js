/*
  Test helpers for the Set Bio page unit and property tests.

  `makeWallet` builds a stub wallet whose OP_RETURN pushes are recorded in
  `broadcasts`, so a test can assert whether anything was broadcast.
  `makeProfiles` builds an in-memory profile store keyed by address.
  `makeMemoSetBio` wires a `MemoSetBio` action handler to that stub wallet.
  Shared by the set-bio unit and property tests.
*/

'use strict'

const MemoSetBio = require('../../src/services/memo-set-bio')

const DEFAULT_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

function makeWallet (address = DEFAULT_ADDRESS) {
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

function makeProfiles () {
  const bios = {}
  return {
    setBio: (addr, bio) => { bios[addr] = bio },
    getBio: (addr) => bios[addr] || null
  }
}

function makeMemoSetBio (deps = {}) {
  const wallet = deps.wallet || makeWallet()
  return new MemoSetBio({ wallet, ...deps })
}

module.exports = { DEFAULT_ADDRESS, makeWallet, makeProfiles, makeMemoSetBio }
