/*
  Unit tests for the profile page address copy behavior.

  Clicking the profile address copies it to the clipboard through an injected
  adapter and shows a transient "Copied to clipboard" confirmation. The
  confirmation clears when the injected timer elapses.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const ProfilePage = require('../../src/services/profile-page')

const ADDR = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'

function makePage (deps = {}) {
  return new ProfilePage({ addr: ADDR, copyToClipboard: async () => {}, ...deps })
}

function makeTimers () {
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

test('copyAddress writes the profile address to the clipboard adapter', async () => {
  const writes = []
  const page = makePage({ copyToClipboard: async (text) => { writes.push(text) } })

  await page.copyAddress()

  assert.deepEqual(writes, [ADDR])
})

test('copyAddress shows the copy confirmation', async () => {
  const page = makePage()

  assert.equal(page.isShowingAddressCopyConfirmation(), false)

  await page.copyAddress()

  assert.equal(page.isShowingAddressCopyConfirmation(), true)
})

test('addressCopyTimeoutElapsed hides the copy confirmation', async () => {
  const page = makePage()
  await page.copyAddress()

  page.addressCopyTimeoutElapsed()

  assert.equal(page.isShowingAddressCopyConfirmation(), false)
})

test('copyAddress schedules a timeout that hides the confirmation', async () => {
  const timers = makeTimers()
  const page = makePage({ setTimer: timers.setTimer, clearTimer: timers.clearTimer })

  await page.copyAddress()

  assert.equal(timers.scheduled.length, 1)

  timers.scheduled[0].fn()

  assert.equal(page.isShowingAddressCopyConfirmation(), false)
})

test('copyAddress clears a previously scheduled timeout before rescheduling', async () => {
  const timers = makeTimers()
  const page = makePage({ setTimer: timers.setTimer, clearTimer: timers.clearTimer })

  await page.copyAddress()
  await page.copyAddress()

  assert.equal(timers.scheduled.length, 2)
  assert.deepEqual(timers.cleared, [1])
})

test('addressCopyTimeoutElapsed clears the scheduled timeout', async () => {
  const timers = makeTimers()
  const page = makePage({ setTimer: timers.setTimer, clearTimer: timers.clearTimer })
  await page.copyAddress()

  page.addressCopyTimeoutElapsed()

  assert.deepEqual(timers.cleared, [1])
})

test('copyAddress notifies the change listener as the confirmation toggles', async () => {
  const changes = []
  const timers = makeTimers()
  const page = makePage({
    onAddressCopyChange: (copied) => changes.push(copied),
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer
  })

  await page.copyAddress()
  timers.scheduled[0].fn()

  assert.deepEqual(changes, [true, false])
})

test('copyAddress throws when the profile has no address', async () => {
  const page = new ProfilePage({ copyToClipboard: async () => {} })

  await assert.rejects(
    () => page.copyAddress(),
    /requires an address/
  )
})

test('copyAddress throws when no clipboard adapter is provided', async () => {
  const page = new ProfilePage({ addr: ADDR })

  await assert.rejects(
    () => page.copyAddress(),
    /requires a clipboard adapter/
  )
})
