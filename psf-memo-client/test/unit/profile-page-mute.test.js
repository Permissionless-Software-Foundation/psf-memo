/*
  Unit tests for the profile page mute controls.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const ProfilePage = require('../../src/services/profile-page')

function makeMemoDb (postsByAddr = {}, muteState = {}) {
  return {
    async getPostsByAddr (addr, { limit, offset }) {
      return { posts: postsByAddr[addr] || [], pagination: { total: (postsByAddr[addr] || []).length } }
    },
    async getFollowState () {
      return false
    },
    async getMuteState (muterAddr, muteeAddr) {
      return muteState[`${muterAddr}:${muteeAddr}`] || false
    }
  }
}

function makeMemoMute (page) {
  return {
    async mute (addr) {
      page.muteState = true
    },
    async unmute (addr) {
      page.muteState = false
    }
  }
}

test('constructor preserves an injected memo mute handler', () => {
  const memoMute = { mute: async () => {}, unmute: async () => {} }
  const page = new ProfilePage({ memoMute })

  assert.equal(page.memoMute, memoMute)
})

test('load returns muteState false when viewing own profile', async () => {
  const addr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const memoDb = makeMemoDb({})
  const page = new ProfilePage({ memoDb, addr, myAddr: addr })

  const result = await page.load()

  assert.equal(result.muteState, false)
})

test('canMute returns false when viewing own profile', () => {
  const addr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const page = new ProfilePage({ memoDb: {}, addr, myAddr: addr })

  assert.equal(page.canMute(), false)
})

test('load fetches mute state when a viewer address is provided', async () => {
  const myAddr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const memoDb = makeMemoDb({}, { [`${myAddr}:${addr}`]: true })
  const page = new ProfilePage({ memoDb, addr, myAddr })

  const result = await page.load()

  assert.equal(result.muteState, true)
  assert.equal(page.isMuting(), true)
})

test('canMute returns true when viewing another profile', () => {
  const myAddr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const page = new ProfilePage({ memoDb: {}, addr, myAddr })

  assert.equal(page.canMute(), true)
})

test('mute delegates to the memo mute handler and updates state', async () => {
  const myAddr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const memoDb = makeMemoDb({})
  const page = new ProfilePage({ memoDb, addr, myAddr })
  page.memoMute = makeMemoMute(page)

  const result = await page.mute()

  assert.equal(result.ok, true)
  assert.equal(page.isMuting(), true)
})

test('unmute delegates to the memo mute handler and updates state', async () => {
  const myAddr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const memoDb = makeMemoDb({})
  const page = new ProfilePage({ memoDb, addr, myAddr })
  page.memoMute = makeMemoMute(page)
  page.muteState = true

  const result = await page.unmute()

  assert.equal(result.ok, true)
  assert.equal(page.isMuting(), false)
})

test('mute throws when no memo mute handler is injected', async () => {
  const myAddr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const page = new ProfilePage({ memoDb: makeMemoDb({}), addr, myAddr })

  await assert.rejects(
    () => page.mute(),
    /requires a memo mute handler/
  )
})

const SUCCESS_TXID = 'aa'.repeat(32)

function makeResultMemoMute (txid = SUCCESS_TXID) {
  return {
    async mute () {
      return txid
    },
    async unmute () {
      return txid
    }
  }
}

test('the mute result modal starts hidden', () => {
  const page = new ProfilePage({ memoDb: makeMemoDb({}) })

  assert.equal(page.showMuteResultModal, false)
  assert.equal(page.lastMuteResult, null)
})

test('a successful mute records a broadcast result and opens the result modal', async () => {
  const myAddr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const page = new ProfilePage({ memoDb: makeMemoDb({}), addr, myAddr })
  page.memoMute = makeResultMemoMute()

  const result = await page.mute()

  assert.equal(result.ok, true)
  assert.equal(result.txid, SUCCESS_TXID)
  assert.equal(page.isMuting(), true)
  assert.equal(page.showMuteResultModal, true)
  assert.equal(page.getMuteBroadcastMessage(), 'Your mute was broadcast to the Bitcoin Cash network.')
  assert.equal(page.explorerUrl(SUCCESS_TXID), `https://bch.loping.net/tx/${SUCCESS_TXID}`)
})

test('a successful unmute shows the unmute broadcast message', async () => {
  const myAddr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const page = new ProfilePage({ memoDb: makeMemoDb({}), addr, myAddr })
  page.memoMute = makeResultMemoMute()
  page.muteState = true

  const result = await page.unmute()

  assert.equal(result.ok, true)
  assert.equal(page.isMuting(), false)
  assert.equal(page.showMuteResultModal, true)
  assert.equal(page.getMuteBroadcastMessage(), 'Your unmute was broadcast to the Bitcoin Cash network.')
})

test('a failed mute records the error, opens the failure modal, and keeps the Mute button', async () => {
  const myAddr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const page = new ProfilePage({ memoDb: makeMemoDb({}), addr, myAddr })
  page.memoMute = {
    async mute () {
      throw new Error('Insufficient balance')
    },
    async unmute () {
      return SUCCESS_TXID
    }
  }

  const result = await page.mute()

  assert.equal(result.ok, false)
  assert.equal(page.isMuting(), false)
  assert.equal(page.showMuteResultModal, true)
  assert.equal(page.getMuteResultError(), 'Insufficient balance')
  assert.equal(page.getMuteBroadcastMessage(), '')
})

test('getMuteResultError returns an empty string when there is no result', () => {
  const page = new ProfilePage({ memoDb: makeMemoDb({}) })

  assert.equal(page.getMuteResultError(), '')
})

test('getMuteResultError returns an empty string for a failure with no message', () => {
  const page = new ProfilePage({ memoDb: makeMemoDb({}) })
  page.lastMuteResult = { ok: false, action: 'mute' }

  assert.equal(page.getMuteResultError(), '')
})

test('dismissing the mute result closes the modal without changing the button state', async () => {
  const myAddr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const addr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const page = new ProfilePage({ memoDb: makeMemoDb({}), addr, myAddr })
  page.memoMute = makeResultMemoMute()

  await page.mute()
  page.dismissMuteResult()

  assert.equal(page.showMuteResultModal, false)
  assert.equal(page.isMuting(), true)
})
