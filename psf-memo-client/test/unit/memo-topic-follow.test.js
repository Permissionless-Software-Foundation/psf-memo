/*
  Unit tests for the Memo topic follow/unfollow behavior.

  A topic follow or unfollow transaction carries the topic name as plain UTF-8
  text with the Memo topic-follow (0x6d0d) or topic-unfollow (0x6d0e) prefix.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const MemoTopicFollow = require('../../src/services/memo-topic-follow')

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

function makeWallet (address = MY_ADDRESS) {
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
  const state = {}
  return {
    state,
    setTopicFollowState: (selfAddr, room, isFollowing) => {
      if (!state[selfAddr]) state[selfAddr] = {}
      state[selfAddr][room] = isFollowing
    },
    getTopicFollowState: (selfAddr, room) => state[selfAddr]?.[room] || false
  }
}

test('follow broadcasts with the Memo topic-follow prefix and topic name', async () => {
  const wallet = makeWallet()
  const memoTopicFollow = new MemoTopicFollow({ wallet })

  await memoTopicFollow.follow('bitcoin')

  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, MemoTopicFollow.MEMO_TOPIC_FOLLOW_PREFIX)
  assert.equal(wallet.broadcasts[0].msg, 'bitcoin')
})

test('unfollow broadcasts with the Memo topic-unfollow prefix and topic name', async () => {
  const wallet = makeWallet()
  const memoTopicFollow = new MemoTopicFollow({ wallet })

  await memoTopicFollow.unfollow('bitcoin')

  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, MemoTopicFollow.MEMO_TOPIC_UNFOLLOW_PREFIX)
  assert.equal(wallet.broadcasts[0].msg, 'bitcoin')
})

test('follow reflects the new state on the profile store', async () => {
  const wallet = makeWallet()
  const profiles = makeProfiles()
  const memoTopicFollow = new MemoTopicFollow({ wallet, profiles })

  await memoTopicFollow.follow('bitcoin')

  assert.equal(profiles.getTopicFollowState(MY_ADDRESS, 'bitcoin'), true)
})

test('unfollow reflects the new state on the profile store', async () => {
  const wallet = makeWallet()
  const profiles = makeProfiles()
  const memoTopicFollow = new MemoTopicFollow({ wallet, profiles })

  await memoTopicFollow.unfollow('bitcoin')

  assert.equal(profiles.getTopicFollowState(MY_ADDRESS, 'bitcoin'), false)
})

test('follow rejects an empty topic name', async () => {
  const wallet = makeWallet()
  const memoTopicFollow = new MemoTopicFollow({ wallet })

  await assert.rejects(
    () => memoTopicFollow.follow(''),
    { code: 'topic_follow_validation', message: /Topic name is required/ }
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('follow requires a wallet', async () => {
  const memoTopicFollow = new MemoTopicFollow({})

  await assert.rejects(
    () => memoTopicFollow.follow('bitcoin'),
    /requires a wallet/
  )
})

test('follow surfaces a broadcast failure', async () => {
  const wallet = makeWallet()
  wallet.sendOpReturn = async () => { throw new Error('broadcast failed') }
  const memoTopicFollow = new MemoTopicFollow({ wallet })

  await assert.rejects(
    () => memoTopicFollow.follow('bitcoin'),
    /broadcast failed/
  )
})
