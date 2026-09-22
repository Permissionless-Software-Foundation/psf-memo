/*
  Test helpers for the profile address copy behavior.

  `makeAddressCopyPage` builds a ProfilePage wired to a no-op clipboard adapter
  (override `copyToClipboard` to record writes). `makeFakeTimers` captures the
  confirmation timer callbacks and clear calls so a test can elapse the
  confirmation deterministically without real time.
  Shared by the address-copy unit and property tests.
*/

'use strict'

const ProfilePage = require('../../src/services/profile-page')

const PROFILE_ADDR = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'

function makeAddressCopyPage (deps = {}) {
  return new ProfilePage({
    addr: PROFILE_ADDR,
    copyToClipboard: async () => {},
    ...deps
  })
}

function makeFakeTimers () {
  const scheduled = []
  const cleared = []
  let nextId = 0
  return {
    scheduled,
    cleared,
    setTimer (fn) {
      nextId += 1
      scheduled.push({ id: nextId, fn })
      return nextId
    },
    clearTimer (id) {
      cleared.push(id)
    }
  }
}

module.exports = { PROFILE_ADDR, makeAddressCopyPage, makeFakeTimers }
