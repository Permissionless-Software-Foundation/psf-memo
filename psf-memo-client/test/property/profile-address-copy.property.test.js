/*
  Property tests for the profile page address copy behavior.

  The unit tests probe the confirmation flow at fixed fixtures. These
  properties pin the address-copy invariants over broad random addresses:

    - write: copyAddress writes exactly the profile address once, returns it,
      and shows the confirmation.
    - timeout: the scheduled confirmation timer hides the confirmation exactly
      once and notifies the change listener true then false.
    - elapse: addressCopyTimeoutElapsed hides the confirmation, clears the
      pending timer once, and is safe to call again.
    - destroy: destroy clears the pending timer without changing the visible
      confirmation, and is safe when nothing is pending.
    - markup: ProfileAddress always shows the address and shows the confirmation
      text exactly when copied, with deterministic rendering.

  All generation is seeded, so runs are reproducible.
*/

'use strict'

const test = require('node:test')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const { seededRandom, forAll } = require('./harness')
const {
  makeAddressCopyPage,
  makeFakeTimers
} = require('../support/address-copy')
const { randomRecentProfileAddr } = require('../support/recent-profiles')
const ProfileAddress = require('../../src/components/app-body/profile/profile-address')

const rng = seededRandom(20260923)
const COPIED_TEXT = 'Copied to clipboard'

function randomAddr () {
  return randomRecentProfileAddr(rng)
}

function renderAddress (props) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProfileAddress, props)
  )
}

test('copyAddress writes the address once, confirms, and returns it', async () => {
  await forAll(
    () => randomAddr(),
    async (addr) => {
      const writes = []
      const page = makeAddressCopyPage({
        addr,
        copyToClipboard: async (text) => { writes.push(text) }
      })

      const returned = await page.copyAddress()

      return writes.length === 1 &&
        writes[0] === addr &&
        returned === addr &&
        page.isShowingAddressCopyConfirmation() === true
    },
    { label: 'profile address copy write', samples: 500 }
  )
})

test('the scheduled confirmation timeout hides the confirmation once', async () => {
  await forAll(
    () => randomAddr(),
    async (addr) => {
      const timers = makeFakeTimers()
      const changes = []
      const page = makeAddressCopyPage({
        addr,
        onAddressCopyChange: (copied) => changes.push(copied),
        setTimer: timers.setTimer,
        clearTimer: timers.clearTimer
      })

      await page.copyAddress()
      const scheduled = timers.scheduled.length
      timers.scheduled[0].fn()

      return scheduled === 1 &&
        page.isShowingAddressCopyConfirmation() === false &&
        changes.length === 2 &&
        changes[0] === true &&
        changes[1] === false
    },
    { label: 'profile address copy timeout', samples: 500 }
  )
})

test('elapsing the confirmation clears the pending timer exactly once', async () => {
  await forAll(
    () => randomAddr(),
    async (addr) => {
      const timers = makeFakeTimers()
      const page = makeAddressCopyPage({
        addr,
        setTimer: timers.setTimer,
        clearTimer: timers.clearTimer
      })

      await page.copyAddress()
      const returned = page.addressCopyTimeoutElapsed()
      page.addressCopyTimeoutElapsed()

      return returned === page &&
        page.isShowingAddressCopyConfirmation() === false &&
        timers.cleared.length === 1
    },
    { label: 'profile address copy elapse', samples: 400 }
  )
})

test('destroy clears the pending timer without hiding the confirmation', async () => {
  await forAll(
    () => randomAddr(),
    async (addr) => {
      const timers = makeFakeTimers()
      const page = makeAddressCopyPage({
        addr,
        setTimer: timers.setTimer,
        clearTimer: timers.clearTimer
      })

      await page.copyAddress()
      const returned = page.destroy()

      return returned === page &&
        page.isShowingAddressCopyConfirmation() === true &&
        timers.scheduled.length === 1 &&
        timers.cleared.length === 1
    },
    { label: 'profile address copy destroy', samples: 400 }
  )
})

test('destroy is safe when no confirmation timer is pending', async () => {
  await forAll(
    () => randomAddr(),
    async (addr) => {
      const timers = makeFakeTimers()
      const page = makeAddressCopyPage({
        addr,
        setTimer: timers.setTimer,
        clearTimer: timers.clearTimer
      })

      const returned = page.destroy()

      return returned === page &&
        page.isShowingAddressCopyConfirmation() === false &&
        timers.cleared.length === 0
    },
    { label: 'profile address copy destroy idle', samples: 300 }
  )
})

test('ProfileAddress shows the confirmation exactly when copied', async () => {
  await forAll(
    () => ({ addr: randomAddr(), copied: rng() < 0.5 }),
    ({ addr, copied }) => {
      const html = renderAddress({ address: addr, copied })
      return html.includes(addr) && html.includes(COPIED_TEXT) === copied
    },
    { label: 'profile address markup confirmation', samples: 500 }
  )
})

test('rendering the same ProfileAddress props twice yields the same markup', async () => {
  await forAll(
    () => ({ addr: randomAddr(), copied: rng() < 0.5 }),
    ({ addr, copied }) => {
      const first = renderAddress({ address: addr, copied })
      const second = renderAddress({ address: addr, copied })
      return first === second
    },
    { label: 'profile address render determinism', samples: 300 }
  )
})
