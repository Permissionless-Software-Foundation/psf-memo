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
